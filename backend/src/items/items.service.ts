import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

/** CRUD pur. Les actions take/restock passent par ItemActionsFacade. */
@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemRepo: Repository<Item>,
  ) {}

  /**
   * Tri par statut décroissant : l'ordre de l'ENUM PostgreSQL suit sa
   * déclaration (`available`, `low`, `out_of_stock`, `to_restock`), donc DESC
   * fait remonter ce qui demande une action en haut de l'étagère.
   */
  findAllInGroup(groupId: string): Promise<Item[]> {
    return this.itemRepo.find({
      where: { groupId },
      order: { status: 'DESC', name: 'ASC' },
    });
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
