import type { Item } from '@/types/api';

/**
 * Ce qu'il faut savoir d'un produit pour parler de son conditionnement.
 *
 * Un `Item` le satisfait, une ligne de courses aussi — elle recopie ces deux
 * champs. Les fonctions ci-dessous n'ont jamais eu besoin de plus, et exiger un
 * `Item` entier obligerait la liste de courses à en fabriquer un faux.
 */
export interface Packaging {
  unit: string | null;
  packSize: number | null;
}

/**
 * Traduction entre ce que l'utilisateur dit et ce que le domaine compte.
 *
 * Le backend ne connaît **que** des unités de base : douze rouleaux, jamais
 * « deux paquets ». C'est ici, et nulle part ailleurs, que le conditionnement
 * se convertit — le faire entrer dans la state machine, les seuils et
 * l'historique coûterait bien plus que ce qu'il rapporterait.
 */

/** Vrai quand l'item s'achète par lot. */
export function hasPacks(item: Packaging): boolean {
  return (item.packSize ?? 0) > 1;
}

/** Unités contenues dans `packs` paquets — ce qui part vraiment à l'API. */
export function unitsInPacks(item: Packaging, packs: number): number {
  return hasPacks(item) ? packs * (item.packSize ?? 1) : packs;
}

/**
 * Accorde le nom de l'unité. Sans `unit`, on ne met rien plutôt qu'un mot
 * générique : « 12 » se lit mieux que « 12 unités ».
 */
export function withUnit(item: Packaging, count: number): string {
  if (!item.unit) return String(count);

  return `${count} ${plural(item.unit, count)}`;
}

/**
 * Nombre de paquets proposé par défaut au rachat : de quoi refaire le plein,
 * arrondi au lot supérieur. On n'achète pas un tiers de paquet.
 */
export function defaultRestockPacks(item: Item): number {
  const missing = (item.targetQuantity ?? 0) - (item.quantity ?? 0);
  const size = item.packSize ?? 1;

  return Math.max(Math.ceil(missing / size), 1);
}

/** « 2 paquets · 12 rouleaux », pour lever l'ambiguïté d'un compteur de lots. */
export function packSummary(item: Packaging, packs: number): string | null {
  if (!hasPacks(item)) return null;

  const units = unitsInPacks(item, packs);

  return `${packs} ${plural('paquet', packs)} · ${withUnit(item, units)}`;
}

/** Symboles de mesure : invariables, « 3 kg » et non « 3 kgs ». */
const INVARIANT = new Set(['g', 'kg', 'mg', 'l', 'cl', 'ml', 'dl', 'cm', 'm']);

/**
 * Pluriel volontairement sommaire, mais pas naïf au point d'écrire
 * « rouleaus » : en français, les mots en `-eau`, `-au` et `-eu` prennent un
 * `x`. Un mot déjà terminé par `s`, `x` ou `z` ne bouge pas, et les symboles
 * d'unité restent invariables.
 *
 * Le reste prend un `s`, et se trompera sur des exceptions qu'un champ libre de
 * vingt caractères ne verra presque jamais.
 */
function plural(word: string, count: number): string {
  if (count < 2) return word;

  const lower = word.toLowerCase();
  if (INVARIANT.has(lower)) return word;
  if (/[sxz]$/.test(lower)) return word;
  if (/(eau|au|eu)$/.test(lower)) return `${word}x`;

  return `${word}s`;
}
