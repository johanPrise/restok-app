import type { Item, ShoppingLine } from '@/types/api';
import {
  defaultRestockPacks,
  hasPacks,
  packSummary,
  unitsInPacks,
  withUnit,
} from './units';

/**
 * Les deux sections de la maquette : ce qui vient de l'étagère, et ce qu'on a
 * ajouté à la main.
 *
 * La distinction n'est pas cosmétique — la première colonne se rachète et
 * remet du stock, la seconde disparaît une fois achetée. Les mélanger
 * laisserait croire que « du pain » entre quelque part.
 *
 * L'ordre du serveur est conservé tel quel : il place le non coché en premier,
 * ce qui reste à prendre avant ce qui est déjà dans le chariot.
 */
export function splitLines(lines: readonly ShoppingLine[]): {
  fromShelf: ShoppingLine[];
  free: ShoppingLine[];
} {
  return {
    fromShelf: lines.filter((line) => line.itemId !== null),
    free: lines.filter((line) => line.itemId === null),
  };
}

/** « 3 sur 8 cochés » — le récapitulatif, juste sous le titre. */
export function checkedSummary(lines: readonly ShoppingLine[]): string {
  const checked = lines.filter((line) => line.checked).length;

  return `${checked} sur ${lines.length} coché${checked === 1 ? '' : 's'}`;
}

export function checkedCount(lines: readonly ShoppingLine[]): number {
  return lines.filter((line) => line.checked).length;
}

/**
 * Ce qu'il faut prendre, sous le nom.
 *
 * En paquets quand l'item s'achète par lot : au rayon on attrape des paquets,
 * pas des rouleaux. Les deux sont dits, parce qu'un compteur de lots seul est
 * ambigu — « 2 » de quoi ?
 *
 * `null` quand la ligne ne dit pas de quantité : un item en suivi binaire, ou
 * « du pain ». Mieux vaut ne rien écrire qu'écrire « 1 ».
 */
export function lineQuantity(line: ShoppingLine): string | null {
  if (line.quantity === null) return null;

  if (hasPacks(line) && line.quantity % (line.packSize ?? 1) === 0) {
    return packSummary(line, line.quantity / (line.packSize ?? 1));
  }

  return withUnit(line, line.quantity);
}

/**
 * Une quantité a-t-elle un sens sur cette ligne ?
 *
 * Sur un item suivi en présence, le rachat ignore la quantité : proposer de la
 * saisir promettrait un effet qui n'aura pas lieu. Une ligne libre, elle, n'a
 * pas d'item pour lui interdire quoi que ce soit — « deux paquets de chips »
 * est une chose parfaitement dicible.
 */
export function countable(line: ShoppingLine): boolean {
  return line.trackingType !== 'threshold';
}

/**
 * Ce que le compteur affiche quand on corrige une ligne : des **paquets** si
 * l'item s'achète par lot, des unités sinon. C'est l'unité dans laquelle on
 * attrape les choses au rayon.
 *
 * Une ligne sans quantité démarre à un — il faut bien partir de quelque part,
 * et zéro voudrait dire « ne pas acheter ».
 */
export function packsOf(line: ShoppingLine): number {
  const quantity = line.quantity ?? 1;
  if (!hasPacks(line)) return quantity;

  return Math.max(Math.ceil(quantity / (line.packSize ?? 1)), 1);
}

/**
 * L'initiale de qui a coché, pour la pastille.
 *
 * Sur un nom vide — le serveur renvoie `null` quand le compte a disparu —
 * l'appelant n'affiche pas de pastille du tout plutôt qu'un rond muet.
 */
export function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

/**
 * Les items de l'étagère déjà sur la liste.
 *
 * Calculé ici plutôt que renvoyé par `GET /items` : l'étagère n'a pas à savoir
 * que les courses existent, et les deux listes sont déjà en cache côté client.
 */
export function itemsOnList(lines: readonly ShoppingLine[]): Set<string> {
  return new Set(
    lines.map((line) => line.itemId).filter((id): id is string => id !== null),
  );
}

/** Ce qu'on propose au-dessus du champ d'ajout. Trois : au-delà, on lit une liste. */
const MAX_SUGGESTIONS = 3;

/**
 * Les items de l'étagère qui répondent à ce qu'on est en train de taper.
 *
 * Sans ça, écrire « Café » crée une ligne libre homonyme : elle disparaîtra à
 * la validation sans rien remettre en stock, et l'étagère restera à zéro. La
 * suggestion est donc le seul moyen de rattacher ce qu'on tape à ce que le
 * groupe suit vraiment.
 *
 * Ce qui est déjà sur la liste n'est pas proposé — l'API le refuserait (409),
 * et proposer une action qui échoue est pire que ne rien proposer.
 */
export function suggestItems(
  items: readonly Item[],
  lines: readonly ShoppingLine[],
  query: string,
): Item[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const already = itemsOnList(lines);

  return items
    .filter(
      (item) =>
        !already.has(item.id) && item.name.toLowerCase().includes(needle),
    )
    .slice(0, MAX_SUGGESTIONS);
}

/**
 * Combien d'unités proposer en mettant un item sur la liste : de quoi refaire
 * le plein, arrondi au paquet. Même calcul que le serveur au versement — les
 * deux chemins doivent proposer la même chose, sinon le pré-remplissage dépend
 * de la porte par laquelle on est entré.
 *
 * `undefined` en suivi binaire : il n'y a rien à compter.
 */
export function suggestedQuantity(item: Item): number | undefined {
  if (item.trackingType !== 'quantity') return undefined;

  return unitsInPacks(item, defaultRestockPacks(item));
}

/**
 * Ce que l'étagère réclame et qui n'est pas encore sur la liste.
 *
 * Miroir du filtre du serveur — `low` compris, on va au magasin avant la
 * rupture. Il ne sert qu'à décider si « récupérer ce qui est à racheter »
 * a encore quelque chose à verser : proposer un bouton qui ne ferait rien est
 * pire que ne pas le proposer.
 */
export function missingFromList(
  items: readonly Item[],
  lines: readonly ShoppingLine[],
): Item[] {
  const already = itemsOnList(lines);

  return items.filter(
    (item) => item.status !== 'available' && !already.has(item.id),
  );
}
