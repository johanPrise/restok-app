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
    /**
     * Le nom au moment de la suppression.
     *
     * Porté par l'event plutôt que relu en base : les recettes en ont besoin
     * pour survivre à la disparition d'un item — l'ingrédient garde son nom et
     * devient libre — et un abonné n'a pas à savoir qu'il faut un `withDeleted`
     * pour retrouver une ligne soft-deleted.
     */
    public readonly itemName: string,
  ) {}
}
