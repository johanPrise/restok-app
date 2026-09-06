import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ActionHistoryService } from '../action-history/action-history.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { FREE_ITEMS } from '../billing/limits';
import type { LastAction } from '../action-history/action-history.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { Item, ItemStatus, TrackingType } from './entities/item.entity';
import { ITEM_DELETED, ItemDeletedEvent } from './events/item-deleted.event';
import { autoTransition } from './item-state-machine';
import { statusForQuantity } from './strategies/quantity-tracking.strategy';
import { BUSINESS_CODES, badRequest, conflict } from '../common/business-error';

/**
 * `out_of_stock` ne doit jamais être persisté : la spec le fait suivre
 * automatiquement de `to_restock`. Un item créé ou reconfiguré avec une
 * quantité nulle doit atterrir au même endroit qu'un item vidé par une prise.
 */
function settle(status: ItemStatus): ItemStatus {
  return autoTransition(status) ?? status;
}

export interface ItemWithLastAction extends Item {
  /** `null` tant que personne n'a rien pris ni racheté. */
  lastAction: LastAction | null;
}

/** CRUD pur. Les actions take/restock passent par ItemActionsFacade. */
@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemRepo: Repository<Item>,
    private readonly actionHistoryService: ActionHistoryService,
    private readonly eventEmitter: EventEmitter2,
    private readonly entitlements: EntitlementsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Tri par statut décroissant : l'ordre de l'ENUM PostgreSQL suit sa
   * déclaration (`available`, `low`, `out_of_stock`, `to_restock`), donc DESC
   * fait remonter ce qui demande une action en haut de l'étagère.
   */
  async findAllInGroup(groupId: string): Promise<ItemWithLastAction[]> {
    const items = await this.itemRepo.find({
      where: { groupId },
      order: { status: 'DESC', name: 'ASC' },
    });

    // Une requête pour toute l'étagère, pas une par tag.
    const lastActions = await this.actionHistoryService.findLastActionByItem(
      items.map((item) => item.id),
    );

    return items.map((item) => ({
      ...item,
      lastAction: lastActions.get(item.id) ?? null,
    }));
  }

  /**
   * Création d'un item, plafonnée sur le palier gratuit.
   *
   * **Toute la méthode passe en transaction, et le groupe y est verrouillé.**
   * Sans ça, deux admins qui ajoutent au même instant lisent tous les deux
   * « 24 items » et écrivent tous les deux : le plafond laisse passer 26. Le
   * verrou de ligne sérialise les créations d'un même groupe, ce qui ne coûte
   * rien — on ne crée pas des items en rafale — et ferme le trou pour de bon.
   *
   * `count` ignore les items soft-deletés, ce qui est la définition voulue :
   * le plafond compte ce qu'on suit, pas ce qu'on a suivi.
   */
  async create(dto: CreateItemDto, groupId: string): Promise<Item> {
    const trackingType = dto.trackingType ?? TrackingType.THRESHOLD;

    if (trackingType === TrackingType.QUANTITY && dto.quantity === undefined) {
      throw badRequest(
        BUSINESS_CODES.INITIAL_QUANTITY_REQUIRED,
        'Précise la quantité initiale pour un item suivi en quantité',
      );
    }

    const quantity =
      trackingType === TrackingType.QUANTITY ? dto.quantity! : null;
    const lowThreshold = dto.lowThreshold ?? 1;

    return this.dataSource.transaction(async (manager) => {
      await this.assertRoomForItem(manager, groupId);

      const repo = manager.getRepository(Item);

      return repo.save(
        repo.create({
          name: dto.name,
          trackingType,
          quantity,
          lowThreshold,
          // Faute de mieux, la quantité initiale fait référence : « plein, c'est
          // ce que j'ai en créant l'item ».
          targetQuantity:
            quantity === null ? null : (dto.targetQuantity ?? quantity),
          // `unit` et `packSize` décrivent l'item, pas son stock : ils valent
          // aussi en suivi binaire, où ils ne s'affichent simplement nulle part.
          unit: dto.unit ?? null,
          packSize: dto.packSize ?? null,
          format: dto.format ?? null,
          groupId,
          status:
            quantity === null
              ? ItemStatus.AVAILABLE
              : settle(statusForQuantity(quantity, lowThreshold)),
        }),
      );
    });
  }

  /**
   * Le plafond du palier gratuit, ou rien si le groupe a payé.
   *
   * Le `SELECT … FOR UPDATE` sur le groupe est ce qui rend le compte fiable :
   * compter des lignes ne verrouille pas celles qui n'existent pas encore, donc
   * c'est le groupe lui-même qu'on verrouille, une fois par création.
   */
  private async assertRoomForItem(
    manager: EntityManager,
    groupId: string,
  ): Promise<void> {
    await manager.query('SELECT 1 FROM "group" WHERE id = $1 FOR UPDATE', [
      groupId,
    ]);

    if (await this.entitlements.isUnlocked(groupId, manager)) return;

    const tracked = await manager
      .getRepository(Item)
      .count({ where: { groupId } });
    if (tracked < FREE_ITEMS) return;

    throw conflict(
      BUSINESS_CODES.FREE_ITEM_LIMIT_REACHED,
      `L'étagère gratuite s'arrête à ${FREE_ITEMS} articles. Les tiens restent tous là — il n'y a que l'ajout qui attend.`,
      { max: FREE_ITEMS },
    );
  }

  /**
   * Édition par un admin — reconfiguration, pas action utilisateur : le statut
   * est recalculé hors state machine quand le mode de suivi change.
   */
  async update(
    itemId: string,
    groupId: string,
    dto: UpdateItemDto,
  ): Promise<Item> {
    const item = await this.findOneInGroup(itemId, groupId);

    if (dto.name !== undefined) item.name = dto.name;
    if (dto.lowThreshold !== undefined) item.lowThreshold = dto.lowThreshold;
    // Survivent au changement de mode, contrairement à `quantity` : décrire un
    // item en rouleaux reste vrai même quand on cesse de les compter.
    if (dto.unit !== undefined) item.unit = dto.unit;
    if (dto.packSize !== undefined) item.packSize = dto.packSize;
    if (dto.format !== undefined) item.format = dto.format;

    const trackingType = dto.trackingType ?? item.trackingType;

    if (trackingType === TrackingType.QUANTITY) {
      const quantity = dto.quantity ?? item.quantity;
      if (quantity === null) {
        throw badRequest(
          BUSINESS_CODES.QUANTITY_REQUIRED_TO_SWITCH,
          'Précise la quantité en stock pour passer en suivi par quantité',
        );
      }
      item.quantity = quantity;
      item.targetQuantity =
        dto.targetQuantity ?? item.targetQuantity ?? quantity;
      item.status = settle(statusForQuantity(quantity, item.lowThreshold));
    } else {
      item.quantity = null;
      item.targetQuantity = null;
      // `low` n'existe pas en suivi binaire : on le ramène à disponible.
      if (item.status === ItemStatus.LOW) item.status = ItemStatus.AVAILABLE;
    }

    item.trackingType = trackingType;
    return this.itemRepo.save(item);
  }

  /**
   * Le format se corrige **sans être admin**, contrairement au reste de la
   * configuration d'un item.
   *
   * C'est une observation, pas un réglage : celui qui rentre du magasin lit
   * l'étiquette et sait ce qu'il a pris. Lui demander de passer par un admin,
   * c'est garantir que l'information ne sera jamais donnée.
   */
  async setFormat(
    itemId: string,
    groupId: string,
    format: string | undefined,
  ): Promise<Item> {
    const item = await this.findOneInGroup(itemId, groupId);
    const trimmed = format?.trim();

    // Une chaîne vide efface : se tromper ne doit pas être définitif.
    item.format = trimmed ? trimmed : null;

    return this.itemRepo.save(item);
  }

  async remove(itemId: string, groupId: string): Promise<void> {
    const item = await this.findOneInGroup(itemId, groupId);
    await this.itemRepo.softRemove(item);

    // La suppression est douce : rien ne cascade. L'event laisse le reste de
    // l'app faire le ménage sans que l'étagère ait à savoir qui l'écoute.
    //
    // `emitAsync` et non `emit` : les abonnés écrivent en base — une ligne de
    // courses supprimée, un ingrédient converti en texte libre — et `emit` ne
    // les attend pas. La réponse partait donc avant eux, et un appel immédiat
    // pouvait lire un ingrédient à moitié converti, sans nom. Invisible sur une
    // base tiède, reproductible sur une base froide.
    //
    // Ce n'est pas le cas des events de statut, qu'on émet volontairement après
    // commit sans les attendre : là, l'abonné notifie, et un échec d'envoi ne
    // doit pas annuler une prise. Ici l'abonné *complète* la suppression.
    await this.eventEmitter.emitAsync(
      ITEM_DELETED,
      new ItemDeletedEvent(itemId, groupId, item.name),
    );
  }

  /** Le filtre sur groupId isole les groupes : un item d'ailleurs est introuvable. */
  async findOneInGroup(itemId: string, groupId: string): Promise<Item> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId, groupId },
    });

    if (!item) {
      throw new NotFoundException('Item introuvable');
    }

    return item;
  }
}
