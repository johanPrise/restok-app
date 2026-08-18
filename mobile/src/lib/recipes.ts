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

/** Le libellé de la pastille. */
export function feasibilityLabel(state: Feasibility): string {
  if (state.kind === 'ready') return 'Tout est là';
  if (state.kind === 'unknown') return 'Rien de suivi';

  const count = state.items.length;

  return `Il manque ${count} chose${count > 1 ? 's' : ''}`;
}
