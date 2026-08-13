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
  /** Chrome flottante : barre d'onglets, FAB. Voir `chrome` plus bas. */
  chrome: 24,
  /** Un élément **dans** la chrome — une pastille d'onglet. */
  chromeItem: 16,
  full: 999,
} as const;

export const border = {
  /** Le « fil » du tag. La profondeur vient de là, pas d'une ombre portée. */
  hairline: 1,
  /** L'arête de la chrome flottante — un liseré `thread`, pas un trait d'encre. */
  rim: 1,
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
 * **Extension assumée du §3.**
 *
 * Le §3 interdit l'ombre portée : la profondeur vient de l'écart `paper` /
 * `paperRaised` et d'un fil de 1px. Cette règle parle du **contenu** — les tags
 * sont des étiquettes posées sur une étagère, et une étiquette ne lévite pas.
 *
 * Le FAB, lui, ne repose sur rien : il passe **au-dessus** de l'étagère, et le
 * contenu défile dessous. Lui donner le même traitement plat qu'un tag le
 * collerait au fond et effacerait la couche qu'il occupe.
 *
 * La barre d'onglets n'est **pas** dans ce cas — le Figma la montre ancrée
 * dans le flux, pas en survol : elle suit donc le traitement du contenu (fil
 * `thread`, aplat, aucune ombre), pas celui-ci. `chrome` ne reste donc utile
 * qu'au FAB, seul élément qui flotte réellement.
 *
 * L'ombre reste au niveau 3 de l'échelle Material, celui des composants de
 * navigation. Au-delà, il pèserait plus qu'une feuille modale.
 */
export const chrome = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 4,
} as const;

/**
 * La barre d'onglets, d'après le Figma : ancrée en bas dans le flux normal
 * (pas de `position: absolute`, pas de rayon, pas d'ombre), un simple fil en
 * haut. Elle ne flotte pas — donc rien à réserver dans les écrans en dessous.
 */
export const tabBar = {
  height: 80,
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
