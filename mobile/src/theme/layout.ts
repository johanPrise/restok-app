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

/**
 * La barre d'onglets flotte **au-dessus** du contenu plutôt que de le pousser :
 * c'est ce qui donne au verre dépoli quelque chose à flouter. En contrepartie,
 * chaque écran d'onglet doit réserver la place qu'elle occupe, sinon son
 * dernier élément finit caché dessous.
 */
export const tabBar = {
  height: MIN_TOUCH_TARGET + spacing.xs * 2,
  /** Entre la barre et le bord de l'écran, et entre la barre et le contenu. */
  gap: spacing.xs,
  radius: 24,
  inset: spacing.sm,
} as const;

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

/**
 * Géométrie du balayage.
 *
 * Le geste ne dit pas seulement *quoi*, il dit *combien* : passé le seuil de
 * validation, chaque `unitStep` supplémentaire ajoute une unité. Un item suivi
 * en binaire s'arrête à une, mais garde une course confortable — `minTravel` —
 * pour que le geste ait le même poids partout.
 */
export const swipe = {
  threshold: 72,
  unitStep: 36,
  minTravel: 120,
} as const;

/** Course maximale du tag sous le doigt, pour un nombre d'unités donné. */
export function swipeTravel(maxUnits: number): number {
  return Math.max(
    swipe.minTravel,
    swipe.threshold + (maxUnits - 1) * swipe.unitStep,
  );
}

/** Unités exprimées par une course. Zéro en deçà du seuil : le geste est annulé. */
export function swipeUnits(distance: number, maxUnits: number): number {
  'worklet';
  const travelled = Math.abs(distance);
  if (travelled < swipe.threshold) return 0;

  const extra = Math.floor((travelled - swipe.threshold) / swipe.unitStep);

  return Math.min(1 + extra, maxUnits);
}
