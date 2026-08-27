import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { Item, ItemStatus, TrackingType } from '../items/entities/item.entity';
import { ItemActionsFacade } from '../items/item-actions.facade';
import { AddShoppingLineDto } from './dto/add-shopping-line.dto';
import { UpdateShoppingLineDto } from './dto/update-shopping-line.dto';
import { ShoppingLine } from './entities/shopping-line.entity';
import { BUSINESS_CODES, badRequest, conflict } from '../common/business-error';

/** Code PostgreSQL d'une violation de contrainte d'unicité. */
const UNIQUE_VIOLATION = '23505';

/**
 * Ce que l'étagère réclame. `low` en fait partie : on va au magasin **avant**
 * la rupture, sinon la liste arrive toujours un jour trop tard.
 *
 * `out_of_stock` n'est jamais durable — la state machine bascule aussitôt en
 * `to_restock` — mais on le garde pour ne pas dépendre de ce détail.
 */
const WANTED_STATUSES: readonly ItemStatus[] = [
  ItemStatus.TO_RESTOCK,
  ItemStatus.OUT_OF_STOCK,
  ItemStatus.LOW,
];

/**
 * Ce qu'on pré-remplit sur une ligne versée depuis l'étagère : de quoi refaire
 * le plein, arrondi au paquet — on n'achète pas un tiers de lot.
 *
 * `null` en suivi binaire, qui ne compte rien : la ligne dira « racheter », sans
 * quantité.
 *
 * C'est ici, et pas côté interface, que se décide ce que la liste propose : le
 * client peut ensuite corriger, mais il ne devine pas.
 */
function refillQuantity(item: Item): number | null {
  if (item.trackingType !== TrackingType.QUANTITY) return null;

  const missing = (item.targetQuantity ?? 0) - (item.quantity ?? 0);
  const pack = item.packSize && item.packSize > 1 ? item.packSize : 1;

  return Math.max(Math.ceil(missing / pack), 1) * pack;
}

/**
 * Ce qu'un rachat déclenché depuis la liste fait entrer en stock.
 *
 * La façade **exige** une quantité en suivi quantité, et refuse l'action sinon.
 * Une ligne peut pourtant arriver sans : ajoutée à la main, sans préciser
 * combien. Plutôt que de faire échouer la validation des courses sur ce détail,
 * on retombe sur ce que l'étagère aurait proposé.
 *
 * En suivi binaire, `undefined` : il n'y a rien à compter.
 */
function restockQuantity(line: ShoppingLine): number | undefined {
  if (line.item?.trackingType !== TrackingType.QUANTITY) return undefined;

  return line.quantity ?? refillQuantity(line.item) ?? 1;
}

/**
 * Ce que le client reçoit. Le nom est **calculé** et non stocké : une ligne
 * liée le tient de son item, donc un item renommé reste juste sur la liste.
 */
export interface ShoppingLineView {
  id: string;
  itemId: string | null;
  name: string;
  quantity: number | null;
  checked: boolean;
  checkedBy: string | null;
  checkedAt: Date | null;
  /** Recopiés de l'item : au rayon, c'est ce qui dit quoi prendre. */
  unit: string | null;
  packSize: number | null;
  format: string | null;
  /**
   * Le mode de suivi de l'item, `null` sur une ligne libre.
   *
   * L'interface en a besoin pour savoir si préciser une quantité veut dire
   * quelque chose : sur un item suivi en présence, le rachat ignore la
   * quantité, et proposer de la saisir serait promettre un effet qui n'aura
   * pas lieu.
   */
  trackingType: TrackingType | null;
}

@Injectable()
export class ShoppingService {
  constructor(
    @InjectRepository(ShoppingLine)
    private readonly lineRepo: Repository<ShoppingLine>,
    @InjectRepository(Item)
    private readonly itemRepo: Repository<Item>,
    private readonly itemActions: ItemActionsFacade,
  ) {}

  /**
   * Les lignes non cochées d'abord : au magasin, ce qui reste à prendre importe
   * plus que ce qui est déjà dans le chariot.
   */
  async findAllInGroup(groupId: string): Promise<ShoppingLineView[]> {
    const lines = await this.lineRepo.find({
      where: { groupId },
      relations: { item: true, checkedBy: true },
      order: { checked: 'ASC', createdAt: 'ASC' },
    });

    return lines.map((line) => this.toView(line));
  }

  async add(
    dto: AddShoppingLineDto,
    groupId: string,
    memberId: string,
  ): Promise<ShoppingLineView> {
    const hasItem = dto.itemId !== undefined;
    const hasLabel = dto.label !== undefined && dto.label.trim().length > 0;

    // Une ligne est soit le prolongement d'un item, soit du texte libre. Les
    // deux à la fois laisserait deux noms concurrents sur la même ligne.
    if (hasItem === hasLabel) {
      // Ce cas ne vient jamais de l'app, qui n'offre pas de l'atteindre — mais
      // le message part quand même à l'écran si elle change. On décrit donc ce
      // qu'il faut faire, pas le contrat de la route.
      throw badRequest(
        BUSINESS_CODES.SHOPPING_LINE_NEEDS_ITEM_OR_LABEL,
        'Choisis un item de l’étagère, ou écris ce que tu veux acheter.',
      );
    }

    if (hasItem) {
      // Le filtre sur groupId isole les groupes : un item d'ailleurs est
      // introuvable, pas interdit.
      const item = await this.itemRepo.findOne({
        where: { id: dto.itemId!, groupId },
      });
      if (!item) throw new NotFoundException('Item introuvable');
    }

    const line = this.lineRepo.create({
      groupId,
      itemId: dto.itemId ?? null,
      label: hasLabel ? dto.label!.trim() : null,
      quantity: dto.quantity ?? null,
      addedById: memberId,
    });

    try {
      await this.lineRepo.save(line);
    } catch (error) {
      // La base tranche les doublons, pas une comparaison de chaînes : deux
      // personnes qui ajoutent le même item en même temps ne peuvent pas
      // gagner toutes les deux.
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === UNIQUE_VIOLATION
      ) {
        throw conflict(
          BUSINESS_CODES.SHOPPING_ITEM_ALREADY_LISTED,
          'Cet item est déjà sur la liste',
        );
      }
      throw error;
    }

    return this.findOneInGroup(line.id, groupId);
  }

  async update(
    lineId: string,
    groupId: string,
    memberId: string,
    dto: UpdateShoppingLineDto,
  ): Promise<ShoppingLineView> {
    const line = await this.load(lineId, groupId);

    if (dto.quantity !== undefined) line.quantity = dto.quantity;

    if (dto.checked !== undefined && dto.checked !== line.checked) {
      line.checked = dto.checked;
      // Décocher efface l'auteur : sinon la ligne garderait le nom de quelqu'un
      // qui, justement, s'est ravisé.
      line.checkedById = dto.checked ? memberId : null;
      line.checkedAt = dto.checked ? new Date() : null;
    }

    await this.lineRepo.save(line);

    return this.findOneInGroup(lineId, groupId);
  }

  async remove(lineId: string, groupId: string): Promise<void> {
    const line = await this.load(lineId, groupId);
    await this.lineRepo.remove(line);
  }

  /**
   * Verse dans la liste tout ce que l'étagère réclame.
   *
   * C'est **la** raison d'être de cet écran : une liste de courses qui ne se
   * remplit pas depuis le stock n'a aucun avantage sur un bloc-notes.
   *
   * Les items déjà présents sont ignorés en silence plutôt que de lever un
   * conflit — on verse ce qui manque, on ne signale pas ce qui est déjà là.
   */
  async refill(groupId: string, memberId: string): Promise<ShoppingLineView[]> {
    const wanted = await this.itemRepo.find({
      where: { groupId, status: In([...WANTED_STATUSES]) },
    });

    const already = new Set(
      (
        await this.lineRepo.find({
          where: { groupId },
          select: { id: true, itemId: true },
        })
      ).map((line) => line.itemId),
    );

    const fresh = wanted
      .filter((item) => !already.has(item.id))
      .map((item) =>
        this.lineRepo.create({
          groupId,
          itemId: item.id,
          label: null,
          quantity: refillQuantity(item),
          addedById: memberId,
        }),
      );

    if (fresh.length > 0) await this.lineRepo.save(fresh);

    return this.findAllInGroup(groupId);
  }

  /**
   * Les lignes cochées deviennent des rachats. Une action au lieu d'un
   * balayage par item.
   *
   * Les rachats passent par la façade, donc par la state machine et
   * l'historique — jamais par une écriture directe dans `item`.
   *
   * Chaque item est traité dans **sa propre** transaction : si l'un échoue, les
   * précédents restent. Ce sont des achats réels, déjà dans le chariot ; les
   * annuler parce que le suivant a échoué effacerait un fait du monde.
   */
  async complete(
    groupId: string,
    memberId: string,
  ): Promise<ShoppingLineView[]> {
    const checked = await this.lineRepo.find({
      where: { groupId, checked: true },
      relations: { item: true },
    });

    for (const line of checked) {
      // Une ligne libre n'a rien à racheter : elle disparaît, c'est tout.
      if (line.item) {
        await this.itemActions.restock(
          line.item.id,
          groupId,
          memberId,
          restockQuantity(line),
        );
      }
      await this.lineRepo.remove(line);
    }

    // Ce qui n'a pas été trouvé au magasin reste pour la prochaine fois.
    return this.findAllInGroup(groupId);
  }

  private async findOneInGroup(
    lineId: string,
    groupId: string,
  ): Promise<ShoppingLineView> {
    const line = await this.lineRepo.findOne({
      where: { id: lineId, groupId },
      relations: { item: true, checkedBy: true },
    });
    if (!line) throw new NotFoundException('Ligne introuvable');

    return this.toView(line);
  }

  private async load(lineId: string, groupId: string): Promise<ShoppingLine> {
    const line = await this.lineRepo.findOne({
      where: { id: lineId, groupId },
    });
    if (!line) throw new NotFoundException('Ligne introuvable');

    return line;
  }

  private toView(line: ShoppingLine): ShoppingLineView {
    return {
      id: line.id,
      itemId: line.itemId,
      // Une ligne liée tient son nom de l'item, jamais d'une copie figée.
      name: line.item?.name ?? line.label ?? '',
      quantity: line.quantity,
      checked: line.checked,
      checkedBy: line.checkedBy?.name ?? null,
      checkedAt: line.checkedAt,
      unit: line.item?.unit ?? null,
      packSize: line.item?.packSize ?? null,
      format: line.item?.format ?? null,
      trackingType: line.item?.trackingType ?? null,
    };
  }
}
