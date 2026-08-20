import { Item } from '../../items/entities/item.entity';

/**
 * Rattache une ligne d'ingrédient importée à un item de l'étagère.
 *
 * Sans cet appariement, une recette sauvegardée n'aurait que des ingrédients
 * libres : elle serait donc « on ne sait pas », classée en bas, et le tri par
 * faisabilité — la seule chose que l'app apporte — ne dirait rien. C'est la
 * pièce qui rend l'import utile, pas un confort.
 *
 * L'appariement est **suggestif**, pas autoritaire : il propose un lien que
 * l'utilisateur corrige d'un geste sur la fiche. C'est ce qui le distingue du
 * problème des unités, où deviner produisait un stock faux et invisible. Ici,
 * une erreur se voit — « Sel » apparié à « Sel de bain » saute aux yeux — et se
 * répare sans rien casser.
 */

/** « 1 poulet coupé en morceaux » → « poulet coupe en morceaux ». */
function normalise(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      // Retire les accents : « café » et « cafe » désignent la même chose.
      .replace(/[̀-ͯ]/g, '')
      // Quantités et unités de tête : « 100 g de miel », « 1 c. à soupe d'huile ».
      .replace(/^[\d\s.,/]+/, '')
      .replace(
        /^(g|kg|mg|l|cl|ml|dl|c\.?|cs|cc|cuilleres?|cuillere|pincee|pincees|sachet|sachets|boite|boites|tranche|tranches|gousse|gousses|bouteille|bouteilles|pot|pots|verre|verres)\b/,
        '',
      )
      .replace(/^\s*(a|de|d|du|des|la|le|les|l)\b['\s]*/g, '')
      .replace(/[^a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Les mots trop courts apparient n'importe quoi — « eau » se retrouverait dans
 * « eau de fleur d'oranger », et « sel » dans « céleri ».
 */
const MIN_WORD = 3;

function words(text: string): string[] {
  return normalise(text)
    .split(' ')
    .filter((word) => word.length >= MIN_WORD);
}

/**
 * « lait **de** coco » n'est pas du lait ; « riz basmati » est du riz.
 *
 * Les deux ont pourtant la même forme — le nom de l'item, plus un mot. Aucune
 * comparaison de chaînes ne les distingue, mais le français donne un indice :
 * un complément introduit par une préposition nomme le plus souvent **un autre
 * produit** (lait de coco, sucre de canne, huile de tournesol), là où un
 * adjectif nomme une variété (riz basmati, lait entier, sucre roux).
 *
 * La règle se trompe parfois — « farine de blé » sera refusée alors que c'est
 * bien de la farine. Ce sens-là est le bon : un faux positif fait **mentir
 * l'app sur ce qu'on possède**, et quelqu'un part cuisiner sans son ingrédient.
 * Un faux négatif la rend seulement trop prudente — l'ingrédient reste en texte
 * libre, il compte comme manquant, et on rachète quelque chose qu'on avait.
 */
const COMPLEMENT = /^(de|des|du|d|a|au|aux)\b/;

function namesAnotherProduct(itemName: string, line: string): boolean {
  const phrase = normalise(itemName);
  const text = normalise(line);
  const at = text.indexOf(phrase);
  // Le nom de l'item n'apparaît pas d'un seul tenant : la question ne se pose
  // pas, les mots sont dispersés dans la ligne.
  if (phrase.length === 0 || at < 0) return false;

  return COMPLEMENT.test(text.slice(at + phrase.length).trim());
}

/**
 * L'item que cette ligne désigne, ou `undefined`.
 *
 * On exige que **tous** les mots du nom de l'item apparaissent dans la ligne :
 * « huile d'olive » ne s'apparie donc pas à « huile de tournesol », alors qu'un
 * simple mot commun l'aurait fait. À égalité, le nom le plus long gagne — il
 * est le plus spécifique.
 */
export function matchItem(
  line: string,
  items: readonly Item[],
): Item | undefined {
  const haystack = words(line);
  if (haystack.length === 0) return undefined;

  let best: Item | undefined;
  let bestLength = 0;

  for (const item of items) {
    const needle = words(item.name);
    if (needle.length === 0) continue;

    const matches =
      needle.every((word) => haystack.includes(word)) &&
      !namesAnotherProduct(item.name, line);
    if (matches && needle.join(' ').length > bestLength) {
      best = item;
      bestLength = needle.join(' ').length;
    }
  }

  return best;
}
