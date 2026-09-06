/**
 * La palette de `DESIGN.md`.
 *
 * Deux règles non négociables, et la seconde est la conséquence d'un calcul :
 *
 * 1. Les couleurs de statut ne décorent **jamais**. Si un élément est `low`,
 *    c'est qu'un stock est bas.
 * 2. Le statut n'est **jamais porté par la couleur seule**. Trois couleurs qui
 *    atteignent le même contraste sur le même fond ont, par construction, la
 *    même luminance — donc la même valeur de gris. On ne peut pas avoir à la
 *    fois trois statuts tous lisibles et trois statuts distinguables en
 *    niveaux de gris. Le statut passe donc par la position (sa section), la
 *    longueur (le remplissage de la jauge) et le mot ; la couleur confirme.
 *
 * Chaque valeur ci-dessous est mesurée contre le fond le plus défavorable de
 * son mode, **dans les deux thèmes**. C'est la leçon de l'ancien `contrast.ts`,
 * qui portait un tableau de ratios relevés en clair seulement et écrivait, en
 * sombre, un badge « Stock bas » à 1,61:1.
 */
export interface Palette {
  /** Fond de page. */
  paper: string;
  /** Ce qui flotte au-dessus de la page : toast, carte, état vide. */
  raised: string;
  /** Ce qui est inerte ou en attente : bouton désactivé, jauge vide. */
  sunken: string;
  ink: string;
  inkSoft: string;
  /**
   * Le trait, quand il n'y a pas d'autre recours — le bord d'un champ de
   * saisie, qui porte la reconnaissance du contrôle. Il remplace l'ancien
   * `thread`, qui plafonnait à 1,33:1 : il n'était pas discret, il était
   * invisible.
   */
  rule: string;
  /** L'unique accent. Ce sur quoi on peut agir, et rien d'autre. */
  accent: string;
  /**
   * L'état pressé **augmente le contraste avec la page** : il fonce en clair,
   * il s'éclaircit en sombre. C'est une règle, pas deux couleurs choisies
   * séparément.
   */
  accentPress: string;
  /** Ce qui s'écrit sur `accent` et sur `accentPress`. */
  onAccent: string;
  /** Statut « épuisé / à racheter ». */
  out: string;
  /** Statut « stock bas ». */
  low: string;
  /** Statut « disponible ». */
  ok: string;
}

/**
 * Ratios mesurés sur `paper` — le fond le plus défavorable du mode clair.
 *
 * | token       | ratio | seuil |
 * |-------------|-------|-------|
 * | ink         | 14,08 |  4,5  |
 * | inkSoft     |  5,11 |  4,5  |
 * | accent      |  5,63 |  4,5  |
 * | out         |  4,54 |  4,5  |
 * | low         |  4,53 |  4,5  |
 * | ok          |  4,51 |  4,5  |
 * | rule        |  3,21 |  3,0  |
 *
 * Le libellé du bouton primaire lit 6,06 sur `accent`, 9,68 sur `accentPress`,
 * 4,88 sur `out`. Le bouton inerte lit 11,41.
 */
export const lightPalette: Palette = {
  paper: '#F2F4F0',
  raised: '#FBFCFA',
  sunken: '#D8DED9',
  ink: '#1C2620',
  inkSoft: '#5A6B62',
  rule: '#7E8B85',
  accent: '#2B6B5E',
  accentPress: '#1D4A41',
  onAccent: '#FBFCFA',
  out: '#BB4C2A',
  low: '#8C6A1A',
  ok: '#53785B',
};

/**
 * Ratios mesurés sur `paper` — le fond le plus défavorable du mode sombre.
 *
 * | token       | ratio | seuil |
 * |-------------|-------|-------|
 * | ink         | 14,90 |  4,5  |
 * | inkSoft     |  5,98 |  4,5  |
 * | accent      |  7,10 |  4,5  |
 * | out         |  5,13 |  4,5  |
 * | low         |  9,23 |  4,5  |
 * | ok          |  8,19 |  4,5  |
 * | rule        |  3,90 |  3,0  |
 *
 * Le libellé du bouton primaire lit 7,10 sur `accent`, 9,98 sur `accentPress`,
 * 5,13 sur `out`. Le bouton inerte lit 10,02.
 *
 * Vert-noir profond plutôt que gris neutre : garde l'identité en sombre.
 */
export const darkPalette: Palette = {
  paper: '#141A16',
  raised: '#1E2620',
  sunken: '#2E3A33',
  ink: '#E8EDE9',
  inkSoft: '#8A9A90',
  rule: '#6A7A72',
  accent: '#5FB3A0',
  // Plus clair que `accent`, et non plus foncé : en sombre, s'éloigner du fond
  // veut dire s'éclaircir. Le sens du geste est le même, sa direction s'inverse.
  accentPress: '#8AD0C0',
  onAccent: '#141A16',
  out: '#D96A45',
  low: '#E3B54A',
  ok: '#93BA9B',
};
