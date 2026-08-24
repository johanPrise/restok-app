import type { Item, ItemStatus, Recipe } from '@/types/api';

/**
 * Ce qui compte comme « il n'y en a plus » pour cuisiner.
 *
 * Volontairement plus strict que la règle des courses, qui range aussi `low`
 * parmi les manquants : on va au magasin **avant** la rupture, mais on cuisine
 * **jusqu'à** la rupture. Un stock bas se cuisine encore.
 */
const EMPTY_STATUSES: readonly ItemStatus[] = ['out_of_stock', 'to_restock'];

export type Feasibility =
  | { kind: 'ready' }
  | { kind: 'missing'; items: string[] }
  /** Aucun ingrédient lié : l'app n'a rien à quoi se raccrocher. */
  | { kind: 'unknown' };

/**
 * Ce que le placard permet, pour une recette.
 *
 * Les ingrédients **libres** ne rendent jamais un plat infaisable : personne ne
 * suit le sel, et un item supprimé de l'étagère devient libre lui aussi. Ne pas
 * savoir n'est pas la même chose que manquer.
 *
 * D'où le troisième état : une recette sans aucun ingrédient lié n'est pas
 * « faisable », elle est **muette**. Annoncer « tout est là » sur la foi de
 * rien serait exactement le genre de mensonge tranquille que cet écran doit
 * éviter.
 */
export function feasibility(
  recipe: Recipe,
  items: readonly Item[],
): Feasibility {
  const byId = new Map(items.map((item) => [item.id, item]));

  const linked = recipe.ingredients.filter(
    (ingredient) => ingredient.itemId !== null,
  );
  if (linked.length === 0) return { kind: 'unknown' };

  const missing = linked
    .map((ingredient) => byId.get(ingredient.itemId!))
    // Un item que l'étagère ne renvoie pas — supprimé entre deux
    // rafraîchissements — ne compte ni pour ni contre.
    .filter((item): item is Item => item !== undefined)
    .filter((item) => EMPTY_STATUSES.includes(item.status))
    .map((item) => item.name);

  return missing.length === 0
    ? { kind: 'ready' }
    : { kind: 'missing', items: missing };
}

/** Le nombre qui sert à trier — les muettes en dernier, jamais entre deux plats. */
function rank(state: Feasibility): number {
  if (state.kind === 'ready') return 0;
  if (state.kind === 'missing') return state.items.length;

  return Number.MAX_SAFE_INTEGER;
}

/**
 * L'ordre **est** l'information (§5) : ce qui se cuisine ce soir en tête.
 *
 * Pas de troisième palier « il manque presque tout » : il demanderait un seuil
 * arbitraire que personne ne saurait défendre, alors que le compte des
 * manquants dit déjà la même chose, en plus précis.
 */
export function sortByFeasibility(
  recipes: readonly Recipe[],
  items: readonly Item[],
): { recipe: Recipe; state: Feasibility }[] {
  return recipes
    .map((recipe) => ({ recipe, state: feasibility(recipe, items) }))
    .sort(
      (a, b) =>
        rank(a.state) - rank(b.state) ||
        a.recipe.name.localeCompare(b.recipe.name, 'fr'),
    );
}

/** Trois : au-delà, ce n'est plus un rappel, c'est une seconde liste. */
const TONIGHT_LIMIT = 3;

/**
 * Ce qui se cuisine tout de suite, pour l'annoncer ailleurs que dans l'onglet.
 *
 * Le risque numéro un de cette fonctionnalité est que personne ne détourne son
 * chemin pour aller voir un quatrième onglet. Autant porter la réponse là où
 * les gens passent déjà.
 *
 * Les recettes muettes n'y figurent jamais : on n'annonce pas « faisable » ce
 * dont on ne sait rien.
 */
export function feasibleNow(
  recipes: readonly Recipe[],
  items: readonly Item[],
  limit: number = TONIGHT_LIMIT,
): Recipe[] {
  return sortByFeasibility(recipes, items)
    .filter((entry) => entry.state.kind === 'ready')
    .slice(0, limit)
    .map((entry) => entry.recipe);
}

/**
 * Le libellé de la pastille.
 *
 * Court, parce que la pastille partage sa ligne avec le nom du plat : chaque
 * caractère de trop pousse « Risotto aux champignons » sur une ligne de plus.
 * « choses » disparaît donc — les manquants sont nommés juste en dessous, le
 * compte suffit à annoncer la couleur.
 *
 * « On ne sait pas » plutôt que « Rien de suivi » : c'est ce que la pastille
 * veut dire, et un écran qui admet son ignorance est plus fiable qu'un écran
 * qui la déguise en constat.
 */
export function feasibilityLabel(state: Feasibility): string {
  if (state.kind === 'ready') return 'Tout est là';
  if (state.kind === 'unknown') return 'On ne sait pas';

  return `Il manque ${state.items.length}`;
}

/**
 * La ligne sous le titre d'une recette : pour combien, et de qui elle vient.
 *
 * Seul, « Notée par » désigne toujours la même personne — celle qui lit. On la
 * retire, exactement comme l'auteur disparaît des tags et des lignes de
 * courses.
 *
 * `null` plutôt qu'une chaîne vide quand il n'y a rien à dire : l'écran saute
 * alors le paragraphe au lieu de réserver une ligne blanche sous le titre.
 */
export function recipeByline(recipe: Recipe, solo = false): string | null {
  const parts = [
    recipe.servings ? `Pour ${recipe.servings}` : null,
    solo || !recipe.createdBy ? null : `Notée par ${recipe.createdBy}`,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(' · ') : null;
}
