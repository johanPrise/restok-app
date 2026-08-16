export const ITEM_DELETED = 'item.deleted';

/**
 * Un item quitte l'étagère.
 *
 * La suppression est **douce** — la ligne reste en base pour que l'historique
 * garde un sens — donc aucun `ON DELETE CASCADE` ne se déclenche. Ce qui doit
 * disparaître ailleurs doit être prévenu.
 */
export class ItemDeletedEvent {
  constructor(
    public readonly itemId: string,
    public readonly groupId: string,
  ) {}
}
