import { TextStyle } from 'react-native';

/**
 * Deux familles, trois graisses (`DESIGN.md`).
 *
 * Archivo Black a disparu : il portait `display`, `title` et `tagName` — trois
 * rôles qu'une graisse 600 dans une taille plus grande distingue aussi bien. Il
 * coûtait deux fichiers de fonte au démarrage, et sur `tagName` il imposait des
 * capitales à ce qui se lit le plus dans l'app, le nom d'un item.
 *
 * La monospace reste pour une raison fonctionnelle et une seule : le journal et
 * l'historique se lisent en colonnes, et une colonne n'existe que si les
 * chiffres ont la même avance. Sans chasse fixe, `×12` et `×3` ne s'alignent
 * plus et le registre cesse de prouver quoi que ce soit.
 */
export const fontFamily = {
  /** Tout ce qui se lit en phrase. */
  text: 'WorkSans_400Regular',
  /** Ce sur quoi on peut agir, et les titres. */
  emphasis: 'WorkSans_600SemiBold',
  /** Quantités, dates, compteurs, codes, colonnes. */
  data: 'IBMPlexMono_500Medium',
} as const;

/** Cinq tailles. Chaque cran est un écart qu'on voit. */
export const fontSize = {
  xl: 28,
  lg: 20,
  md: 16,
  sm: 13,
  xs: 11,
} as const;

/**
 * Les titres se resserrent, le texte respire. En dessous de 20px un interligne
 * de 1,1 colle les lignes ; au-dessus, 1,5 les disperse.
 */
const TIGHT = 1.1;
const SNUG = 1.2;
const LOOSE = 1.5;

export const textStyles = {
  /** Un seul par écran, jamais deux. */
  display: {
    fontFamily: fontFamily.emphasis,
    fontSize: fontSize.xl,
    lineHeight: Math.round(fontSize.xl * TIGHT),
  },
  /** Nom d'item, en-tête de groupe. */
  title: {
    fontFamily: fontFamily.emphasis,
    fontSize: fontSize.lg,
    lineHeight: Math.round(fontSize.lg * SNUG),
  },
  body: {
    fontFamily: fontFamily.text,
    fontSize: fontSize.md,
    lineHeight: Math.round(fontSize.md * LOOSE),
  },
  /** Le corps de ce sur quoi on peut agir. La graisse dit l'action, pas la teinte. */
  bodyStrong: {
    fontFamily: fontFamily.emphasis,
    fontSize: fontSize.md,
    lineHeight: Math.round(fontSize.md * LOOSE),
  },
  caption: {
    fontFamily: fontFamily.text,
    fontSize: fontSize.sm,
    lineHeight: Math.round(fontSize.sm * LOOSE),
  },
  /** Une donnée dans une phrase — une quantité au milieu d'un texte. */
  dataBody: {
    fontFamily: fontFamily.data,
    fontSize: fontSize.md,
    lineHeight: Math.round(fontSize.md * LOOSE),
  },
  /** Une donnée dans une colonne : dates, compteurs, montants. */
  data: {
    fontFamily: fontFamily.data,
    fontSize: fontSize.sm,
    lineHeight: Math.round(fontSize.sm * LOOSE),
  },
  /** En-tête de section et libellé technique : mono capitales. */
  dataLabel: {
    fontFamily: fontFamily.data,
    fontSize: fontSize.sm,
    lineHeight: Math.round(fontSize.sm * LOOSE),
    letterSpacing: fontSize.sm * 0.06,
    textTransform: 'uppercase',
  },
  /**
   * Libellé d'onglet, et rien d'autre. Il garde sa casse : la barre écrit
   * « Inventaire », pas « INVENTAIRE ». L'interlettrage est à 0,02 et non 0,06
   * comme ailleurs — en mono il coûte trois pixels sur « Inventaire », et
   * c'est cette place qui sépare les quatre onglets.
   */
  tabLabel: {
    fontFamily: fontFamily.data,
    fontSize: fontSize.xs,
    lineHeight: Math.round(fontSize.xs * LOOSE),
    letterSpacing: fontSize.xs * 0.02,
  },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof textStyles;
