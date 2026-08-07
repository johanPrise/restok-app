import { TextStyle } from 'react-native';

/** §2 du design system : trois polices, trois rôles distincts. */
export const fontFamily = {
  /** Nom d'item sur les tags, titres d'écran. Allure tamponnée. */
  display: 'ArchivoBlack_400Regular',
  body: 'WorkSans_400Regular',
  bodySemibold: 'WorkSans_600SemiBold',
  /**
   * Archivo Bold — moins gras et plus étroit qu'Archivo Black. Employé sur les
   * titres des cartes de choix, où la maquette ne veut pas du poids du Black.
   */
  displayBold: 'Archivo_700Bold',
  /** Quantités, dates, codes d'invitation, historique. */
  mono: 'IBMPlexMono_500Medium',
  /** Libellés d'onglets — la maquette y passe le Bold, pas le Medium. */
  monoBold: 'IBMPlexMono_700Bold',
} as const;

/** Échelle 32 / 24 / 18 / 16 / 13. */
export const fontSize = {
  display: 32,
  title: 24,
  subtitle: 18,
  body: 16,
  caption: 13,
  /**
   * Hors échelle du §2, et volontairement : à 13px les quatre libellés
   * d'onglets ne tiennent plus côte à côte sur 390px. La maquette descend à 11,
   * ce format ne sert nulle part ailleurs.
   */
  tabLabel: 11,
} as const;

const DISPLAY_LINE_HEIGHT = 1.1;
const BODY_LINE_HEIGHT = 1.4;

export const textStyles = {
  display: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.display,
    lineHeight: fontSize.display * DISPLAY_LINE_HEIGHT,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.title,
    lineHeight: fontSize.title * DISPLAY_LINE_HEIGHT,
  },
  /**
   * Nom d'item sur un tag : capitales et léger interlettrage, comme tamponné
   * sur une étiquette. Nulle part ailleurs dans l'app.
   */
  tagName: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.subtitle,
    lineHeight: fontSize.subtitle * DISPLAY_LINE_HEIGHT,
    letterSpacing: fontSize.subtitle * 0.04,
    textTransform: 'uppercase',
  },
  /** Titre d'une carte de choix : capitales, interlettrage large. */
  choiceTitle: {
    fontFamily: fontFamily.displayBold,
    fontSize: fontSize.subtitle,
    lineHeight: fontSize.subtitle * DISPLAY_LINE_HEIGHT,
    letterSpacing: fontSize.subtitle * 0.03,
    textTransform: 'uppercase',
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
    lineHeight: fontSize.body * BODY_LINE_HEIGHT,
  },
  bodyStrong: {
    fontFamily: fontFamily.bodySemibold,
    fontSize: fontSize.body,
    lineHeight: fontSize.body * BODY_LINE_HEIGHT,
  },
  caption: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.caption,
    lineHeight: fontSize.caption * BODY_LINE_HEIGHT,
  },
  /** Corps en monospace — la maquette y passe les descriptions de carte. */
  monoBody: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
    lineHeight: fontSize.body * BODY_LINE_HEIGHT,
  },
  mono: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.caption,
    lineHeight: fontSize.caption * BODY_LINE_HEIGHT,
  },
  /**
   * Libellé d'onglet. Contrairement à `monoLabel`, il garde sa casse : la
   * maquette écrit « Inventaire », pas « INVENTAIRE ».
   */
  tabLabel: {
    fontFamily: fontFamily.monoBold,
    fontSize: fontSize.tabLabel,
    lineHeight: 12,
    letterSpacing: fontSize.tabLabel * 0.05,
  },
  /** En-têtes de section et libellés techniques : mono capitales. */
  monoLabel: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.caption,
    lineHeight: fontSize.caption * BODY_LINE_HEIGHT,
    letterSpacing: fontSize.caption * 0.06,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof textStyles;
