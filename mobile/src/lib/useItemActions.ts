import { useRestockItem, useTakeItem } from '@/api/items';
import { useToast } from '@/components/Toast';
import { useT } from '@/i18n/useT';
import type { Item } from '@/types/api';
import { canSwipe, movement } from './tag-swipe';
import { withUnit } from './units';

interface RunOptions {
  /** Nombre d'unités. Une seule par défaut. */
  units?: number;
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
 * un item vide, et la traduction des unités en quantité envoyée.
 */
export function useItemActions(item: Item): ItemActions {
  const take = useTakeItem();
  const restock = useRestockItem();
  const toast = useToast();
  const t = useT();

  /**
   * L'accusé de réception vit ici, dans le code partagé, plutôt que sur chaque
   * écran : le balayage d'un tag et le bouton de la fiche déclenchent la même
   * action, ils doivent donc dire la même chose. Et une prise écrit au journal
   * — c'est exactement ce qu'on ne veut pas laisser passer en silence.
   */
  const said = (key: string, units: number) => {
    // `movement` rend `undefined` en suivi binaire, qui ne compte rien : on
    // nomme alors l'item plutôt qu'une quantité qui n'existe pas.
    const moved = movement(item, units);

    // Le sujet voyage dans la phrase plutôt que d'être recollé devant : « 3
    // rolls taken » et « 3 rouleaux pris » se ressemblent, mais rien ne dit
    // que la troisième langue mettra son verbe au même bout.
    return t(key, {
      quoi: moved === undefined ? item.name : withUnit(item, moved),
    });
  };

  return {
    canTake: canSwipe(item, 'take'),
    busy: take.isPending || restock.isPending,
    failed: take.isError || restock.isError,

    // `mutate` efface l'erreur de sa propre mutation, pas celle de l'autre :
    // sans ce `reset`, un rachat réussi s'affichait sous le message d'échec
    // d'une prise précédente.
    take: ({ units = 1, onError, settleDelayMs } = {}) => {
      restock.reset();
      take.mutate(
        { itemId: item.id, quantity: movement(item, units), settleDelayMs },
        {
          onError,
          onSuccess: () => toast(said('item.prisToast', units)),
        },
      );
    },

    restock: ({ units = 1, onError, settleDelayMs } = {}) => {
      take.reset();
      restock.mutate(
        { itemId: item.id, quantity: movement(item, units), settleDelayMs },
        {
          onError,
          onSuccess: () => toast(said('item.racheteToast', units)),
        },
      );
    },
  };
}
