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
  /**
   * Ce qui se pose *sur* `pantryTeal` — onglet actif, icône du FAB. La maquette
   * n'y met pas du blanc mais un vert d'eau très clair, qui adoucit le contraste
   * sans le perdre. `paperRaised` (utilisé par Button) y serait plus dur.
   */
  onPantryTeal: string;

  /**
   * Traitement des grandes cartes de choix (onboarding), relevé sur les
   * maquettes. Ces valeurs ne viennent pas du §1 : le Figma y emploie un teal
   * plus saturé que `pantryTeal`, et remplit la carte d'un cran depuis le
   * fond — `thread` en clair, `paperRaised` en sombre.
   */
  choiceSurface: string;
  choiceBorder: string;
  /** Rabat du coin plié : la face cachée du papier, plus sombre. */
  choiceFold: string;
  choiceTitle: string;
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
  onPantryTeal: '#A9E9D8',
  choiceSurface: '#D8DED9',
  choiceBorder: '#095347',
  choiceFold: '#BCC3BC',
  choiceTitle: '#155C50',
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
  // Le vert d'eau du mode clair ne tient pas ici : `pantryTeal` s'éclaircit en
  // sombre, et clair-sur-clair tombe à 2.4:1. On inverse donc le sens du
  // contraste — encre sombre sur la pastille — pour repasser au-dessus de 4.5:1.
  onPantryTeal: '#0F1613',
  mustard: '#E3B54A',
  rustClay: '#D96A45',
  sage: '#93BA9B',
  choiceSurface: '#1E2620',
  choiceBorder: '#2E3A33',
  choiceTitle: '#3A6F61',
  // Relevé sur une capture basse résolution du variant sombre : le rabat s'y
  // distingue à peine du fond. Valeur approchée, à recaler si besoin.
  choiceFold: '#2A332C',
};
