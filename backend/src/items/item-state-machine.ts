import { ConflictException } from '@nestjs/common';
import { ItemStatus } from './entities/item.entity';

/**
 * Transitions autorisées (§2 de la spec).
 *
 * ```
 * available ──(seuil atteint)──> low ──(dernier pris)──> out_of_stock
 *     ^                                                        │
 *     └──────────(rachat confirmé)──── to_restock <────────────┘
 *                                       (automatique)
 * ```
 *
 * Les boucles sur soi-même (`available → available`) couvrent les prises qui
 * font baisser la quantité sans changer de palier.
 *
 * Deux arêtes absentes du schéma sont indispensables en mode quantité, où le
 * statut se déduit du compteur et non de l'action :
 *
 * - `low → available` : un rachat sur stock bas doit pouvoir remettre au vert
 *   sans passer par la rupture.
 * - `to_restock → low` : un rachat partiel qui ne dépasse pas le seuil laisse
 *   l'item en stock bas. Le schéma ne prévoit que `to_restock → available`,
 *   ce qui bloquerait un rachat honnête de 1 unité sur un seuil de 2.
 */
export const ALLOWED_TRANSITIONS: Readonly<
  Record<ItemStatus, readonly ItemStatus[]>
> = {
  [ItemStatus.AVAILABLE]: [
    ItemStatus.AVAILABLE,
    ItemStatus.LOW,
    ItemStatus.OUT_OF_STOCK,
  ],
  [ItemStatus.LOW]: [
    ItemStatus.LOW,
    ItemStatus.AVAILABLE,
    ItemStatus.OUT_OF_STOCK,
  ],
  [ItemStatus.OUT_OF_STOCK]: [ItemStatus.TO_RESTOCK],
  [ItemStatus.TO_RESTOCK]: [ItemStatus.AVAILABLE, ItemStatus.LOW],
};

export function canTransition(from: ItemStatus, to: ItemStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: ItemStatus, to: ItemStatus): void {
  if (!canTransition(from, to)) {
    throw new ConflictException(`Transition interdite : ${from} → ${to}`);
  }
}

/**
 * Transition automatique déclenchée par l'entrée dans un état, sans action
 * utilisateur : une rupture de stock passe aussitôt en « à racheter ».
 *
 * Renvoie `null` quand l'état est stable.
 */
export function autoTransition(status: ItemStatus): ItemStatus | null {
  return status === ItemStatus.OUT_OF_STOCK ? ItemStatus.TO_RESTOCK : null;
}
