import type { Palette } from './colors';

/**
 * L'encre lisible sur un aplat de la palette.
 *
 * Mesuré, pas estimé — et c'est ainsi qu'on a découvert que la pastille
 * « Stock bas » du tag, en ligne depuis des mois, écrivait en `paperRaised` sur
 * `mustard` : **2,16:1**, moins de la moitié du seuil AA. Le jaune et le vert
 * sont des couleurs claires ; il faut de l'encre sombre dessus, pas du papier.
 *
 * Rapports avec `paperRaised` / avec `ink` :
 *
 * | aplat      | papier | encre |
 * |------------|--------|-------|
 * | mustard    |  2,16  |  7,01 |
 * | sage       |  2,65  |  5,72 |
 * | rustClay   |  4,50  |       |
 * | pantryTeal |  6,06  |       |
 */
const NEEDS_DARK_INK: readonly (keyof Palette)[] = ['mustard', 'sage'];

export function textOn(surface: keyof Palette): 'ink' | 'paperRaised' {
  return NEEDS_DARK_INK.includes(surface) ? 'ink' : 'paperRaised';
}
