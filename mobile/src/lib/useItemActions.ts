import { useRestockItem, useTakeItem } from '@/api/items';
import type { Item } from '@/types/api';
import { canSwipe, restockQuantity } from './tag-swipe';

interface RunOptions {
  onError?: () => void;
  /** Retarde le rafraîchissement de la liste, le temps d'une animation. */
  settleDelayMs?: number;
}

export interface ItemActions {
  /** Faux sur un item déjà épuisé : le backend répond 409. */
  canTake: boolean;
  /** Une action est en vol — de quoi désactiver gestes et boutons. */
  busy: boolean;
  failed: boolean;
  take: (options?: RunOptions) => void;
  restock: (options?: RunOptions) => void;
}

/**
 * Les deux actions d'un item, au même endroit pour le geste et pour le bouton.
 *
 * Le §4 exige que rien ne soit atteignable **que** par un geste : le tag et
 * l'écran de détail déclenchent donc exactement le même code, plutôt que deux
 * copies qui finiraient par diverger sur les règles délicates — l'interdit sur
 * un item vide, et la quantité à poser au rachat.
 */
export function useItemActions(item: Item): ItemActions {
  const take = useTakeItem();
  const restock = useRestockItem();

  return {
    canTake: canSwipe(item, 'take'),
    busy: take.isPending || restock.isPending,
    failed: take.isError || restock.isError,

    // `mutate` efface l'erreur de sa propre mutation, pas celle de l'autre :
    // sans ce `reset`, un rachat réussi s'affichait sous le message d'échec
    // d'une prise précédente.
    take: ({ onError, settleDelayMs } = {}) => {
      restock.reset();
      take.mutate({ itemId: item.id, settleDelayMs }, { onError });
    },

    restock: ({ onError } = {}) => {
      take.reset();
      restock.mutate(
        { itemId: item.id, quantity: restockQuantity(item) },
        { onError },
      );
    },
  };
}
