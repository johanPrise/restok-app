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
 */
export const motion = {
  standard: 150,
  gaugeDrain: 200,
  tagUnhook: 150,
} as const;
