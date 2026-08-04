/**
 * Palette du §1 de `stock-app-design.md`.
 *
 * Règle non négociable : les couleurs de statut ne servent **jamais** à
 * décorer. Si un élément est mustard, c'est qu'un stock est bas. C'est ce qui
 * rend la lecture d'un coup d'œil fiable.
 */
export interface Palette {
  /** Fond principal. */
  paper: string;
  /** Surface des tags, légèrement détachée du fond. */
  paperRaised: string;
  ink: string;
  inkSoft: string;
  /** Marque et actions primaires. */
  pantryTeal: string;
  /** État pressed des boutons. */
  pantryTealDeep: string;
  /** Statut « stock bas ». */
  mustard: string;
  /** Statut « épuisé / à racheter ». */
  rustClay: string;
  /** Statut « disponible ». */
  sage: string;
  /** Bordures et séparateurs — le « fil » du tag. */
  thread: string;
}

export const lightPalette: Palette = {
  paper: '#F2F4F0',
  paperRaised: '#FBFCFA',
  ink: '#1C2620',
  inkSoft: '#5A6B62',
  pantryTeal: '#2B6B5E',
  pantryTealDeep: '#1D4A41',
  mustard: '#D9A62E',
  rustClay: '#C4502C',
  sage: '#7FA687',
  thread: '#D8DED9',
};

export const darkPalette: Palette = {
  // Vert-noir profond plutôt que gris neutre : garde l'identité en sombre.
  paper: '#141A16',
  paperRaised: '#1E2620',
  ink: '#E8EDE9',
  inkSoft: '#8A9A90',
  pantryTeal: '#4A9B8A',
  // Le §1 ne donne pas ces deux valeurs en sombre. `pantryTealDeep` doit rester
  // plus foncé que `pantryTeal` pour lire comme un état pressed, et `thread`
  // doit se détacher de `paperRaised` sans le concurrencer.
  pantryTealDeep: '#357366',
  thread: '#2E3A33',
  mustard: '#E3B54A',
  rustClay: '#D96A45',
  sage: '#93BA9B',
};
