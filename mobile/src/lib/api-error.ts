import { ApiError } from '@/api/client';

/**
 * Ce qu'on montre à l'utilisateur quand un appel échoue.
 *
 * `ApiError` porte un message écrit par le backend, lisible tel quel. Toute
 * autre erreur — `TypeError: Network request failed`, `Failed to fetch` — vient
 * de `fetch` lui-même : afficher son texte brut, c'est montrer du jargon à
 * quelqu'un qui veut juste savoir si c'est de sa faute.
 */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;

  return "Le serveur ne répond pas. Vérifie qu'il est bien démarré.";
}

/**
 * Le plus récent des échecs, parmi plusieurs actions.
 *
 * Un écran qui porte six mutations ne peut pas afficher six messages. On prend
 * le dernier tenté plutôt qu'un ordre de priorité arbitraire : c'est celui que
 * l'utilisateur vient de déclencher, donc celui dont il attend la réponse. Un
 * échec plus ancien resté en mémoire ne doit pas masquer le sien.
 */
export function latestFailure(
  mutations: readonly {
    isError: boolean;
    error: unknown;
    submittedAt: number;
  }[],
): string | null {
  const failed = mutations.filter((mutation) => mutation.isError);
  if (failed.length === 0) return null;

  const latest = failed.reduce((newest, mutation) =>
    mutation.submittedAt > newest.submittedAt ? mutation : newest,
  );

  return apiErrorMessage(latest.error);
}
