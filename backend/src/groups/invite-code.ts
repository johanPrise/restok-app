import { randomBytes } from 'node:crypto';

/**
 * Alphabet sans I, O, 0, 1 : le code est lu à voix haute ou recopié depuis un
 * groupe de discussion, les caractères ambigus créent des erreurs de saisie.
 *
 * 32 caractères exactement — 256 % 32 === 0, donc le modulo sur un octet
 * aléatoire reste uniforme (pas de biais).
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const INVITE_CODE_LENGTH = 8;

export function generateInviteCode(length = INVITE_CODE_LENGTH): string {
  const bytes = randomBytes(length);

  let code = '';
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }

  return code;
}

/** Tolère la casse et les espaces : l'utilisateur colle un code reçu par message. */
export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase();
}
