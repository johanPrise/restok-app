import { ItemStatus } from '../../items/entities/item.entity';
import { ItemStatusChangedEvent } from '../../items/events/item-status-changed.event';
import { NotificationsService } from '../notifications.service';
import { NotificationListener } from './notification.listener';

type NotifyGroupMock = jest.Mock<
  Promise<void>,
  [string, string, { excludeMemberId?: string }?]
>;

describe('NotificationListener', () => {
  let listener: NotificationListener;
  let notificationsService: { notifyGroup: NotifyGroupMock };

  const event = (previousStatus: ItemStatus, newStatus: ItemStatus) =>
    new ItemStatusChangedEvent(
      'item-1',
      'Papier toilette',
      'group-1',
      previousStatus,
      newStatus,
      'member-1',
    );

  beforeEach(() => {
    notificationsService = { notifyGroup: jest.fn() as NotifyGroupMock };
    listener = new NotificationListener(
      notificationsService as unknown as NotificationsService,
    );
  });

  describe('rupture de stock', () => {
    it('notifie le groupe', async () => {
      await listener.handleStatusChange(
        event(ItemStatus.AVAILABLE, ItemStatus.OUT_OF_STOCK),
      );

      expect(notificationsService.notifyGroup).toHaveBeenCalledWith(
        'group-1',
        "Papier toilette épuisé — quelqu'un doit racheter",
        { excludeMemberId: 'member-1' },
      );
    });

    it('exclut celui qui a pris le dernier', async () => {
      await listener.handleStatusChange(
        event(ItemStatus.LOW, ItemStatus.OUT_OF_STOCK),
      );

      expect(notificationsService.notifyGroup.mock.calls[0][2]).toEqual({
        excludeMemberId: 'member-1',
      });
    });
  });

  describe('rachat', () => {
    it('notifie quand un item quitte to_restock', async () => {
      await listener.handleStatusChange(
        event(ItemStatus.TO_RESTOCK, ItemStatus.AVAILABLE),
      );

      expect(notificationsService.notifyGroup).toHaveBeenCalledWith(
        'group-1',
        'Papier toilette racheté',
        { excludeMemberId: 'member-1' },
      );
    });

    it('notifie aussi un rachat partiel qui laisse en stock bas', async () => {
      // Le §5 teste `newStatus === 'available'` et raterait ce cas.
      await listener.handleStatusChange(
        event(ItemStatus.TO_RESTOCK, ItemStatus.LOW),
      );

      expect(notificationsService.notifyGroup).toHaveBeenCalledWith(
        'group-1',
        'Papier toilette racheté',
        { excludeMemberId: 'member-1' },
      );
    });
  });

  describe('silence', () => {
    it.each([
      [ItemStatus.AVAILABLE, ItemStatus.AVAILABLE, 'prise sans changement'],
      [ItemStatus.AVAILABLE, ItemStatus.LOW, 'passage en stock bas'],
      [ItemStatus.LOW, ItemStatus.LOW, 'prise sous le seuil'],
      [
        ItemStatus.OUT_OF_STOCK,
        ItemStatus.TO_RESTOCK,
        'transition automatique',
      ],
    ])('ne notifie pas sur %s → %s (%s)', async (previous, next) => {
      await listener.handleStatusChange(event(previous, next));

      expect(notificationsService.notifyGroup).not.toHaveBeenCalled();
    });

    it("n'envoie qu'une notification quand un item se vide", async () => {
      // La façade émet deux events : rupture puis transition automatique.
      // Seul le premier doit parler.
      await listener.handleStatusChange(
        event(ItemStatus.AVAILABLE, ItemStatus.OUT_OF_STOCK),
      );
      await listener.handleStatusChange(
        event(ItemStatus.OUT_OF_STOCK, ItemStatus.TO_RESTOCK),
      );

      expect(notificationsService.notifyGroup).toHaveBeenCalledTimes(1);
    });
  });

  describe('robustesse', () => {
    it("n'échoue pas si l'envoi plante", async () => {
      // L'action utilisateur est déjà committée.
      notificationsService.notifyGroup.mockRejectedValue(new Error('Expo HS'));

      await expect(
        listener.handleStatusChange(
          event(ItemStatus.AVAILABLE, ItemStatus.OUT_OF_STOCK),
        ),
      ).resolves.toBeUndefined();
    });
  });
});
