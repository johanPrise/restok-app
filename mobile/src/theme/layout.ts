/** §3 du design system : grille de base 4px. */
const UNIT = 4;

export const spacing = {
  xs: UNIT * 2, // 8
  sm: UNIT * 3, // 12
  md: UNIT * 4, // 16
  lg: UNIT * 6, // 24
  xl: UNIT * 8, // 32
} as const;

export const radius = {
  tag: 12,
  button: 8,
  /** Le « coin plié » — asymétrique, sur les tags uniquement. */
  tagFoldedCorner: 20,
  full: 999,
} as const;

export const border = {
  /** Le « fil » du tag. La profondeur vient de là, pas d'une ombre portée. */
  hairline: 1,
  /** Liseré latéral d'un item en stock bas. */
  statusAccent: 3,
} as const;

export const gauge = {
  height: 6,
  radius: 3,
} as const;

/** Cible tactile minimale (§8). */
export const MIN_TOUCH_TARGET = 44;

/** §7 : les timestamps passent en date absolue au-delà d'une semaine. */
export const RELATIVE_DATE_MAX_DAYS = 7;

/**
 * §4 : tout est en fade/slide 150ms, sauf le décrochage d'un item épuisé —
 * seul moment orchestré de l'app, sous 600ms au total.
 *
 * Les trois temps s'enchaînent : la jauge se vide, *puis* le tag pivote comme
 * décroché de son fil, *puis* il glisse vers « À racheter ». D'où les délais
 * cumulés plutôt que trois durées indépendantes.
 */
export const motion = {
  standard: 150,
  gaugeDrain: 200,
  tagUnhook: 150,
  tagSlide: 200,
} as const;

export const unhook = {
  drainAt: 0,
  rotateAt: motion.gaugeDrain,
  slideAt: motion.gaugeDrain + motion.tagUnhook,
  /** 550ms — sous les 600 exigés. */
  total: motion.gaugeDrain + motion.tagUnhook + motion.tagSlide,
  /** Le pivot « décroché du fil ». */
  angle: -2,
  /** Vers le haut : « À racheter » est toujours la section au-dessus. */
  lift: -32,
} as const;

/** Course du geste avant validation, et course maximale du tag sous le doigt. */
export const swipe = {
  threshold: 96,
  maxTravel: 140,
} as const;
