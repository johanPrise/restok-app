import type { Item } from '@/types/api';

/** En dessous, l'item est signalé « critique » plutôt que simplement bas. */
const CRITICAL_RATIO = 0.1;

/**
 * Remplissage de la jauge, entre 0 et 1.
 *
 * En mode `threshold` il n'y a rien à compter : la jauge est pleine ou vide,
 * selon le statut. En mode `quantity` elle vaut `quantity / targetQuantity`,
 * **plafonné à 1** — un rachat au-delà de la référence donnerait un ratio
 * supérieur, et le backend ne relève jamais la référence tout seul.
 */
export function fillRatio(item: Item): number {
  const isEmpty =
    item.status === 'out_of_stock' || item.status === 'to_restock';
  if (isEmpty) return 0;

  if (item.quantity === null || !item.targetQuantity) return 1;

  return Math.min(item.quantity / item.targetQuantity, 1);
}

/** Pourcentage entier affiché sur le tag. */
export function fillPercent(item: Item): number {
  return Math.round(fillRatio(item) * 100);
}

/**
 * Un item bas peut être bas « tranquillement » ou au bord de la rupture. Le
 * badge CRITIQUE de la maquette distingue les deux ; le backend n'a que
 * `low`, parce que c'est une nuance d'affichage, pas un état du domaine.
 */
export function isCritical(item: Item): boolean {
  return item.status === 'low' && fillRatio(item) <= CRITICAL_RATIO;
}
