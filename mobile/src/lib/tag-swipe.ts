import type { Item } from '@/types/api';

/**
 * Ce qu'un geste sur un tag peut déclencher (§4). Le sens porte le sens :
 * gauche → droite pour « j'en ai pris », le geste le plus fréquent donc le
 * plus accessible ; droite → gauche pour « j'ai racheté ».
 */
export type SwipeAction = 'take' | 'restock';

function isEmpty(item: Item): boolean {
  return item.status === 'to_restock' || item.status === 'out_of_stock';
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
 * Remplissage auquel le geste aboutit. La jauge y descend en direct pendant
 * que le doigt avance, plutôt que de sauter à la validation.
 */
export function outcomeRatio(item: Item, action: SwipeAction): number {
  // « Le rachat remplit la jauge » (§4).
  if (action === 'restock') return 1;
  // En suivi binaire il n'y a rien à décompter : une prise vide l'item.
  if (item.quantity === null || !item.targetQuantity) return 0;

  return Math.max(item.quantity - 1, 0) / item.targetQuantity;
}

/**
 * Quantité envoyée au rachat. Le backend **pose** la valeur, il ne l'ajoute
 * pas : reposer la quantité de référence remplit donc la jauge. En suivi
 * binaire il n'attend rien, et refuse un corps qui en contiendrait.
 */
export function restockQuantity(item: Item): number | undefined {
  if (item.trackingType !== 'quantity') return undefined;

  return item.targetQuantity ?? item.quantity ?? 1;
}

/** Une prise qui vide l'item déclenche le décrochage (§4). */
export function emptiesOnTake(item: Item): boolean {
  return canSwipe(item, 'take') && outcomeRatio(item, 'take') === 0;
}
