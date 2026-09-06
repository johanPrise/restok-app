/**
 * L'échelle d'espacement de `DESIGN.md` : 4, 8, 16, 24, 32, 48, 64.
 *
 * Les noms disent le **rôle**, pas la taille, parce que c'est le rôle qui doit
 * décider. L'ancienne échelle avait cinq crans dont deux séparés par 4px —
 * `xs` à 8 et `sm` à 12 — et personne ne pouvait dire lequel choisir : `sm`
 * servait 77 fois, à tous les niveaux d'imbrication à la fois.
 *
 * **L'écart entre groupes dépasse strictement l'écart interne, à chaque
 * niveau.** 8 entre les lignes d'une étiquette, 24 entre étiquettes, 48 entre
 * sections. Une carte à 24 de padding se sépare de la suivante par 32, jamais
 * par 24 : sinon le blanc du dedans et le blanc du dehors se valent, et le
 * groupe cesse d'être un groupe.
 */
export const spacing = {
  /** Une étiquette et sa valeur, sur la même ligne. */
  hair: 4,
  /** Entre les éléments d'un même composant. */
  tight: 8,
  /** Padding d'un composant ; entre deux composants d'un groupe. */
  base: 16,
  /** Padding d'une carte ; entre deux étiquettes d'une liste. */
  card: 24,
  /** Entre deux cartes ; entre deux groupes. */
  group: 32,
  /** Entre deux sections ; au-dessus de l'action terminale d'un écran. */
  section: 48,
  /** Respiration d'un état vide. */
  vast: 64,
} as const;

/**
 * Un seul rayon.
 *
 * `none` n'est pas un rayon concurrent, c'est son absence : à 24px, un arrondi
 * de 8 fait lire la case à cocher comme une pastille, et une pastille se coche
 * mal. `full` non plus : un cercle est une forme, pas un traitement de coin.
 */
export const radius = {
  base: 8,
  none: 0,
  full: 999,
} as const;

export const border = {
  /** Le bord d'un champ de saisie — le seul trait qui subsiste. */
  hairline: 1,
  /**
   * Le marqueur de statut. C'est un canal d'**épaisseur**, pas de teinte : il
   * est là ou il n'y est pas, ce qui survit aux niveaux de gris là où trois
   * couleurs à contraste égal ne le peuvent pas.
   */
  accent: 3,
} as const;

/** La jauge. Son arrondi vient de `radius.full` : à 6px de haut, c'est une pilule. */
export const gauge = {
  height: 6,
} as const;

/** Cible tactile minimale. Sans exception — pas même sur une puce de filtre. */
export const MIN_TOUCH_TARGET = 44;

/**
 * Ce qui flotte réellement au-dessus du contenu : le FAB et le toast. Le
 * contenu, lui, ne lévite pas — il se sépare par le blanc.
 *
 * L'ombre reste au niveau 3 de l'échelle Material, celui des composants de
 * navigation. Au-delà, elle pèserait plus qu'une feuille modale.
 */
export const chrome = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 4,
} as const;

/**
 * La barre d'onglets est ancrée en bas dans le flux normal : pas de
 * `position: absolute`, pas de rayon, pas d'ombre. Elle ne flotte pas — donc
 * rien à réserver dans les écrans en dessous.
 */
export const tabBar = {
  height: 80,
} as const;

/** Les timestamps passent en date absolue au-delà d'une semaine. */
export const RELATIVE_DATE_MAX_DAYS = 7;

/**
 * Tout est en fade/slide 150ms, sauf le décrochage d'un item épuisé — seul
 * moment orchestré de l'app, sous 600ms au total.
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
