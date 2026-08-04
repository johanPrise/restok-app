import { TextStyle } from 'react-native';

/** §2 du design system : trois polices, trois rôles distincts. */
export const fontFamily = {
  /** Nom d'item sur les tags, titres d'écran. Allure tamponnée. */
  display: 'ArchivoBlack_400Regular',
  body: 'WorkSans_400Regular',
  bodySemibold: 'WorkSans_600SemiBold',
  /** Quantités, dates, codes d'invitation, historique. */
  mono: 'IBMPlexMono_500Medium',
} as const;

/** Échelle 32 / 24 / 18 / 16 / 13. */
export const fontSize = {
  display: 32,
  title: 24,
  subtitle: 18,
  body: 16,
  caption: 13,
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
  mono: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.caption,
    lineHeight: fontSize.caption * BODY_LINE_HEIGHT,
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
