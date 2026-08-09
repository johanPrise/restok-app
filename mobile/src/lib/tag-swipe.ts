import type { Item } from '@/types/api';

/**
 * Ce qu'un geste sur un tag peut déclencher (§4). Le sens porte le sens :
 * gauche → droite pour « j'en ai pris », le geste le plus fréquent donc le
 * plus accessible ; droite → gauche pour « j'ai racheté ».
 */
export type SwipeAction = 'take' | 'restock';

/** Au-delà, le geste devient pénible : le détail prend le relais. */
export const MAX_SWIPE_UNITS = 6;

function isEmpty(item: Item): boolean {
  return item.status === 'to_restock' || item.status === 'out_of_stock';
}

function counts(item: Item): boolean {
  return item.trackingType === 'quantity';
}

/**
 * Un item déjà épuisé n'a plus rien à donner : le backend renvoie 409 sur une
 * prise. Le rachat, lui, reste toujours possible — la state machine autorise
 * `available → available`.
 */
export function canSwipe(item: Item, action: SwipeAction): boolean {
  return action === 'restock' || !isEmpty(item);
}

/**
 * Combien d'unités un geste peut exprimer au maximum.
 *
 * En suivi binaire il n'y a rien à compter : le geste vaut « le dernier » ou
 * « j'en ai remis ». En quantité, une prise est bornée par le stock — proposer
 * d'en prendre huit quand il en reste trois n'aurait aucun sens.
 */
export function maxUnits(item: Item, action: SwipeAction): number {
  if (!counts(item)) return 1;
  if (action === 'restock') return MAX_SWIPE_UNITS;

  return Math.min(item.quantity ?? 0, MAX_SWIPE_UNITS);
}

/**
 * Stock après un geste de `units` unités. C'est ce que la jauge montre pendant
 * que le doigt avance, plutôt que de sauter à la validation.
 */
export function quantityAfter(
  item: Item,
  action: SwipeAction,
  units: number,
): number {
  const stock = item.quantity ?? 0;

  return action === 'take' ? Math.max(stock - units, 0) : stock + units;
}

/**
 * Remplissage correspondant, entre 0 et 1. Plafonné : un rachat au-delà de la
 * référence ne déborde pas de la jauge.
 */
export function ratioAfter(
  item: Item,
  action: SwipeAction,
  units: number,
): number {
  if (!counts(item) || !item.targetQuantity) {
    return action === 'take' ? 0 : 1;
  }

  return Math.min(quantityAfter(item, action, units) / item.targetQuantity, 1);
}

/**
 * Quantité à envoyer au backend — un **mouvement**, jamais un stock final.
 *
 * En suivi binaire on n'envoie rien : le mode ne compte pas, et le backend
 * refuse une quantité qu'il devrait ignorer.
 */
export function movement(item: Item, units: number): number | undefined {
  return counts(item) ? units : undefined;
}

/**
 * Ce qu'un rachat propose par défaut : de quoi refaire le plein. C'est le
 * geste « je reviens des courses », pas une valeur arbitraire.
 *
 * Volontairement **non plafonné** : `MAX_SWIPE_UNITS` borne la course d'un
 * doigt, pas ce qu'on peut rapporter du magasin. Aux appelants qui passent par
 * le geste de plafonner eux-mêmes.
 */
export function defaultRestockUnits(item: Item): number {
  if (!counts(item)) return 1;

  const missing = (item.targetQuantity ?? 0) - (item.quantity ?? 0);

  return Math.max(missing, 1);
}

/** Une prise qui vide l'item déclenche le décrochage (§4). */
export function emptiesOnTake(item: Item, units: number): boolean {
  return canSwipe(item, 'take') && quantityAfter(item, 'take', units) === 0;
}
