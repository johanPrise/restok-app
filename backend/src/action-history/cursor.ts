import { badRequest, BUSINESS_CODES } from '../common/business-error';

/**
 * Le curseur du journal.
 *
 * Le journal se lit du plus récent au plus ancien. Pagination **par clé** et
 * non par `OFFSET` : un décalage se décale, justement — une action enregistrée
 * pendant qu'on descend pousse toute la suite d'un rang, et la page suivante
 * répète une ligne déjà lue ou en saute une. Dans un registre, les deux sont
 * des mensonges.
 *
 * La clé est le couple `(created_at, id)` et non la seule date : deux actions
 * peuvent tomber dans la même milliseconde — c'est même le cas ordinaire quand
 * on clôture des courses, qui écrit un rachat par ligne cochée. Une clé non
 * unique perdrait des lignes exactement là où il y en a le plus.
 *
 * Opaque côté client : il n'a rien à en déduire, et la clé peut changer sans
 * qu'il s'en aperçoive.
 */
export interface HistoryCursor {
  createdAt: Date;
  id: string;
}

const SEPARATOR = '|';

export function encodeCursor(cursor: HistoryCursor): string {
  const raw = `${cursor.createdAt.toISOString()}${SEPARATOR}${cursor.id}`;

  return Buffer.from(raw, 'utf8').toString('base64url');
}

/**
 * Un curseur illisible est un refus, pas un repli silencieux.
 *
 * Repartir du début serait pire que d'échouer : le client croirait descendre
 * dans le registre et relirait la première page sans le savoir.
 */
export function decodeCursor(value: string): HistoryCursor {
  const raw = Buffer.from(value, 'base64url').toString('utf8');
  const separator = raw.indexOf(SEPARATOR);

  if (separator === -1) throw invalid();

  const createdAt = new Date(raw.slice(0, separator));
  const id = raw.slice(separator + 1);

  if (Number.isNaN(createdAt.getTime()) || id.length === 0) throw invalid();

  return { createdAt, id };
}

function invalid() {
  return badRequest(
    BUSINESS_CODES.INVALID_CURSOR,
    'Ce curseur de journal n’est pas lisible. Recharge la page.',
  );
}
