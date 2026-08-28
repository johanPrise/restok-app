/**
 * Les repères, et lequel montrer.
 *
 * L'app repose sur des gestes et des idées que rien n'annonce : on tire un tag,
 * on clôture des courses qui se reversent en stock, on lit une liste de
 * recettes déjà triée par ce qui manque le moins. Jusqu'ici un seul de ces
 * trois était enseigné.
 *
 * Trois règles gouvernent ce fichier, et elles comptent plus que la liste :
 *
 * 1. **Un seul repère à la fois, dans toute l'app.** Trois repères qui
 *    s'allument le même jour font une visite guidée, et une visite guidée ne
 *    s'apprend pas. D'où une fonction qui *choisit*, plutôt qu'un drapeau par
 *    écran qui déciderait dans son coin.
 *
 * 2. **Un repère meurt à l'usage, pas au renvoi.** C'est ce qui le rend
 *    honnête : il disparaît le jour où il a fait son travail. Le renvoi reste
 *    possible — on ne retient personne — mais il n'est pas le chemin normal.
 *
 * 3. **Il n'apparaît que quand on a de quoi le comprendre.** Annoncer « la
 *    liste est triée par ce qui manque » devant une seule recette n'apprend
 *    rien. Le déclencheur fait partie de ce qu'on enseigne.
 */

/**
 * Les repères, dans l'ordre où ils se disputent la place.
 *
 * L'ordre **est** la priorité : le balayage d'abord, parce que sans lui rien
 * d'autre ne se fait ; les deux idées ensuite, parce qu'elles sont ce que
 * l'app a en propre ; le renommage en dernier, parce qu'il est un confort.
 */
export const HINTS = ['swipe', 'shoppingLoop', 'recipeSort', 'rename'] as const;

export type HintId = (typeof HINTS)[number];

/** Ce qu'un repère a appris, par identifiant. Absent vaut « pas encore ». */
export type Learned = Partial<Record<HintId, boolean>>;

/**
 * L'état de l'app dont dépend le choix.
 *
 * Des nombres et des booléens, rien de plus : les listes elles-mêmes vivent
 * dans le cache de TanStack Query, et les faire entrer ici rendrait cette
 * fonction impossible à tester sans monter la moitié de l'app.
 */
export interface HintContext {
  learned: Learned;
  /** L'écran affiché — un repère ne s'explique que là où il s'exerce. */
  screen: 'shelf' | 'shopping' | 'recipes';
  itemCount: number;
  /** Lignes de courses cochées, en attente de clôture. */
  checkedCount: number;
  recipeCount: number;
  /** Seul un admin renomme ; pour les autres, le titre est un simple titre. */
  isAdmin: boolean;
}

/** En dessous, « c'est trié » décrit un ordre que l'œil ne peut pas vérifier. */
export const MIN_RECIPES_TO_SEE_A_SORT = 3;

/**
 * Ce que chaque repère attend pour avoir un sens.
 *
 * Séparé de l'ordre : celui-ci dit qui passe devant, celle-ci dit qui a le
 * droit de se présenter.
 */
const READY: Record<HintId, (context: HintContext) => boolean> = {
  // Un geste s'explique là où il s'exerce, pas sur une étagère vide.
  swipe: ({ screen, itemCount }) => screen === 'shelf' && itemCount > 0,

  // À la première coche : c'est le moment où la question « et ensuite ? » se
  // pose vraiment. Avant, la clôture est une abstraction.
  shoppingLoop: ({ screen, checkedCount }) =>
    screen === 'shopping' && checkedCount > 0,

  // Trois recettes : en dessous, un tri ne se voit pas, et l'annoncer
  // reviendrait à décrire un ordre que l'œil ne peut pas vérifier.
  recipeSort: ({ screen, recipeCount }) =>
    screen === 'recipes' && recipeCount >= MIN_RECIPES_TO_SEE_A_SORT,

  // Rien à dire à qui ne peut pas renommer. Rien non plus sur une étagère
  // vide, qui a déjà sa phrase et n'a pas besoin d'une seconde.
  //
  // On ne demande pas au serveur si le groupe a déjà été renommé — il ne le
  // sait pas, et le lui faire savoir coûterait une colonne pour une phrase
  // d'aide. Renommer marque le repère comme appris, ce qui suffit : la
  // deuxième règle du fichier fait ici tout le travail.
  rename: ({ screen, isAdmin, itemCount }) =>
    screen === 'shelf' && isAdmin && itemCount > 0,
};

/**
 * Le repère à montrer, ou `null` s'il n'y a rien à apprendre ici maintenant.
 *
 * Le premier de `HINTS` qui n'est pas appris et dont le moment est venu.
 * L'ordre tranche donc entre deux repères prêts **au même endroit** — sur
 * l'étagère, le balayage passe avant le renommage.
 *
 * Un repère qui n'a rien à faire ici laisse simplement passer le suivant. Le
 * contraire — un balayage jamais fait qui bloquerait tout le reste — punirait
 * quelqu'un qui se sert de l'app autrement qu'on l'avait prévu.
 */
export function nextHint(context: HintContext): HintId | null {
  for (const id of HINTS) {
    if (context.learned[id]) continue;
    if (READY[id](context)) return id;
  }

  return null;
}

/**
 * Ce qu'une session enregistrée a déjà appris — ancien drapeau compris.
 *
 * Du temps où le balayage était le seul repère, il se retenait dans un booléen
 * `swipeLearned`. Une session déjà sur l'appareil le porte encore, et
 * l'ignorer ferait réapprendre le geste à tous ceux qui le connaissent : la
 * mise à jour se manifesterait par une régression.
 *
 * La forme est décrite ici plutôt qu'importée du magasin : celui-ci s'adosse
 * au trousseau, donc à un module natif, et la migration doit pouvoir se
 * vérifier sans lui.
 */
export function learnedFrom(
  session: { learned?: Learned; swipeLearned?: boolean } | null,
): Learned {
  if (!session) return {};
  if (session.learned) return session.learned;

  return session.swipeLearned ? { swipe: true } : {};
}
