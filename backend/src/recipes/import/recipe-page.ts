/**
 * Lecture d'une page de recette.
 *
 * On ne gratte pas le HTML : les sites de cuisine publient leurs recettes en
 * **JSON-LD `schema.org/Recipe`**, un format qu'ils exposent exprès pour être
 * lus. Vérifié sur Marmiton et Journal des Femmes — nom, ingrédients et étapes
 * en français, structurés.
 *
 * Une mise en page qui change ne casse donc rien ; seul un site qui cesserait
 * de publier ses données structurées nous ferait revenir au champ libre.
 */

export interface ParsedRecipe {
  name: string;
  /** Les étapes, une par ligne — la forme que la fiche sait déjà afficher. */
  steps: string;
  /** Les lignes brutes : « 1 poulet coupé en morceaux ». */
  ingredients: string[];
  servings: number | null;
}

const SCRIPT = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;

/** Le JSON-LD est souvent imbriqué dans un `@graph` ou un tableau. */
function* findRecipes(node: unknown): Generator<Record<string, unknown>> {
  if (Array.isArray(node)) {
    for (const child of node) yield* findRecipes(child);
    return;
  }
  if (node === null || typeof node !== 'object') return;

  const record = node as Record<string, unknown>;
  const type = record['@type'];
  const isRecipe =
    type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'));
  if (isRecipe) yield record;

  for (const value of Object.values(record)) yield* findRecipes(value);
}

/** `recipeInstructions` arrive en chaîne, en tableau de chaînes, ou en `HowToStep`. */
function readSteps(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (!Array.isArray(value)) return [];

  return value
    .map((step) => {
      if (typeof step === 'string') return step;
      const record = step as Record<string, unknown>;
      // Une section (`HowToSection`) contient elle-même des étapes.
      if (Array.isArray(record.itemListElement)) {
        return readSteps(record.itemListElement).join('\n');
      }
      return typeof record.text === 'string' ? record.text : '';
    })
    .filter((step) => step.length > 0);
}

function readServings(value: unknown): number | null {
  // `recipeYield` arrive en « 4 », en « 4 personnes », ou en tableau des deux.
  const raw: unknown = Array.isArray(value) ? (value as unknown[])[0] : value;
  // Tout le reste — un objet, un null — ne se convertit qu'en « [object
  // Object] », dont on n'extrairait qu'un chiffre imaginaire.
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;

  const digits = /\d+/.exec(raw);

  return digits ? Number(digits[0]) : null;
}

/** `null` quand la page ne publie rien d'exploitable — l'appelant retombe alors sur la saisie. */
export function parseRecipePage(html: string): ParsedRecipe | null {
  for (const match of html.matchAll(SCRIPT)) {
    let payload: unknown;
    try {
      payload = JSON.parse(match[1]) as unknown;
    } catch {
      // Un bloc invalide n'empêche pas de lire les suivants.
      continue;
    }

    for (const recipe of findRecipes(payload)) {
      const name = typeof recipe.name === 'string' ? recipe.name.trim() : '';
      if (!name) continue;

      const ingredients = Array.isArray(recipe.recipeIngredient)
        ? recipe.recipeIngredient
            .filter((line): line is string => typeof line === 'string')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
        : [];

      return {
        name,
        steps: readSteps(recipe.recipeInstructions).join('\n'),
        ingredients,
        servings: readServings(recipe.recipeYield),
      };
    }
  }

  return null;
}
