/**
 * Lecture d'une page de recette de Wikilivres.
 *
 * Les pages suivent une trame stable — `== Ingrédients ==`, `== Préparation ==` —
 * et surtout **chaque ingrédient est balisé** : `{{i|poulet}}`,
 * `{{i|tomate|tomates}}`. C'est ce qui rend cette source meilleure qu'un site
 * de cuisine ordinaire : on récupère « tomate », le nom canonique, là où une
 * page normale ne donne que « 6 tomates bien mûres ».
 *
 * Ce nom propre est ce qui permet de rattacher l'ingrédient à un item de
 * l'étagère de façon fiable — donc de dire ce qui manque avant même d'ouvrir la
 * recette.
 */

export interface WikiRecipe {
  name: string;
  /** Noms canoniques, dans l'ordre de la page, sans doublon. */
  ingredients: string[];
  /** Les étapes, une par ligne. */
  steps: string;
}

/**
 * `{{i|poulet}}`, `{{i|tomate|tomates}}` — le premier paramètre porte le nom
 * canonique, le second l'accord affiché. Un préfixe nommé (`'=oui`) peut
 * précéder : il gère l'élision et ne nous concerne pas.
 */
const INGREDIENT = /\{\{i\|(?:[^|}]*=[^|}]*\|)?([^|}]+)/g;

/** Retire ce que le wikitexte ajoute autour du texte utile. */
function clean(line: string): string {
  return line
    .replace(
      /\{\{i\|(?:[^|}]*=[^|}]*\|)?([^|}]+)(?:\|([^}]+))?\}\}/g,
      (_m, a, b) => String(b ?? a),
    )
    .replace(/\[\[[^\]|]*\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function section(text: string, heading: string): string {
  // `(?![\s\S])` et non `\Z` : JavaScript ne connaît pas cette ancre et la lit
  // comme la lettre « Z ». La section ne se terminait donc jamais en fin de
  // texte, et les étapes disparaissaient sur toute page dont « Préparation »
  // est la dernière section.
  const pattern = new RegExp(
    `^=+\\s*${heading}[^=]*=+\\s*$([\\s\\S]*?)(?=^=+[^=]|(?![\\s\\S]))`,
    'im',
  );

  return pattern.exec(text)?.[1] ?? '';
}

/**
 * Les étapes arrivent en liste à puces ou en paragraphes selon les pages : on
 * garde les lignes de texte, débarrassées de leur puce, et on laisse tomber le
 * reste (modèles, images, catégories).
 */
function readSteps(text: string): string[] {
  return text
    .split('\n')
    .map((line) => clean(line.replace(/^[*#:]+\s*/, '')))
    .filter((line) => line.length > 2 && !line.startsWith('='));
}

export function parseWikiRecipe(title: string, wikitext: string): WikiRecipe {
  const ingredients: string[] = [];
  const source = section(wikitext, 'Ingr[ée]dients') || wikitext;

  for (const match of source.matchAll(INGREDIENT)) {
    const name = match[1].trim().toLowerCase();
    // Un même ingrédient peut être balisé deux fois dans la page.
    if (name.length > 0 && !ingredients.includes(name)) ingredients.push(name);
  }

  return {
    // « Livre de cuisine/Poulet basquaise » → « Poulet basquaise ».
    name: title.replace(/^.*\//, '').trim(),
    ingredients,
    // Sans section reconnaissable, on garde le texte plutôt que rien : une
    // page mal structurée reste lisible, elle n'est simplement pas découpée.
    steps: readSteps(section(wikitext, 'Pr[ée]paration') || wikitext).join(
      '\n',
    ),
  };
}
