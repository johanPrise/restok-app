import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActionHistoryService } from '../action-history/action-history.service';
import type { LastAction } from '../action-history/action-history.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { Item, ItemStatus, TrackingType } from './entities/item.entity';
import { autoTransition } from './item-state-machine';
import { statusForQuantity } from './strategies/quantity-tracking.strategy';

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

  async create(dto: CreateItemDto, groupId: string): Promise<Item> {
    const trackingType = dto.trackingType ?? TrackingType.THRESHOLD;

    if (trackingType === TrackingType.QUANTITY && dto.quantity === undefined) {
      throw new BadRequestException(
        'Précise la quantité initiale pour un item suivi en quantité',
      );
    }

    const quantity =
      trackingType === TrackingType.QUANTITY ? dto.quantity! : null;
    const lowThreshold = dto.lowThreshold ?? 1;

    return this.itemRepo.save(
      this.itemRepo.create({
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
        groupId,
        status:
          quantity === null
            ? ItemStatus.AVAILABLE
            : settle(statusForQuantity(quantity, lowThreshold)),
      }),
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

    const trackingType = dto.trackingType ?? item.trackingType;

    if (trackingType === TrackingType.QUANTITY) {
      const quantity = dto.quantity ?? item.quantity;
      if (quantity === null) {
        throw new BadRequestException(
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

  async remove(itemId: string, groupId: string): Promise<void> {
    const item = await this.findOneInGroup(itemId, groupId);
    await this.itemRepo.softRemove(item);
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
