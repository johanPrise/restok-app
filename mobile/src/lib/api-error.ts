import { ApiError } from '@/api/client';

/**
 * Ce qui s'affiche quand un appel échoue.
 *
 * La règle : **on écrit pour quelqu'un qui fait ses courses**, pas pour celui
 * qui a écrit l'app. Personne n'a de serveur à redémarrer, ne sait ce qu'est un
 * 500, et n'a envie de lire « label must be longer than or equal to 2
 * characters ». Chaque message dit ce qui s'est passé et, quand il y en a une,
 * ce qu'on peut y faire.
 *
 * Les messages du backend passent tels quels — ils sont écrits pour être lus
 * (« Cet item est déjà sur la liste »). Ceux de la validation, non : ils sont
 * remplacés, parce qu'ils décrivent un contrat d'API.
 */
export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    // Tout ce qui n'est pas une réponse du serveur vient de `fetch` : le réseau
    // a manqué. C'est de loin le cas le plus fréquent, et le moins grave.
    return 'Pas de connexion pour le moment.';
  }

  if (error.status === 401) return 'Ta session a expiré, reconnecte-toi.';
  if (error.status === 403) return 'Tu n’as pas accès à ça.';
  if (error.status === 404) return 'Ça n’existe plus.';
  if (error.status >= 500)
    return 'Ça coince de notre côté. Réessaie dans un moment.';

  // Une règle métier refusée, écrite pour être lue : « Cet item est déjà sur la
  // liste », « Précise la quantité rachetée ».
  if (!error.fromValidation && error.message) return error.message;

  return 'Cette information n’est pas valide.';
}

interface MutationOutcome {
  isError: boolean;
  isSuccess: boolean;
  error: unknown;
  submittedAt: number;
}

/**
 * Le message à afficher, ou `null` s'il n'y a plus rien à signaler.
 *
 * Un écran qui porte six mutations ne peut pas afficher six messages. On prend
 * le dernier geste tenté plutôt qu'un ordre de priorité arbitraire : c'est
 * celui dont l'utilisateur attend la réponse.
 *
 * Et un échec **se périme**. `isError` reste vrai jusqu'à la prochaine
 * tentative de *cette* mutation : sans cette comparaison, « Ça n'existe plus. »
 * restait affiché sous le champ pendant qu'on continuait tranquillement à
 * cocher. Un geste réussi depuis efface donc le reproche.
 */
export function latestFailure(
  mutations: readonly MutationOutcome[],
): string | null {
  const newest = (kept: readonly MutationOutcome[]) =>
    kept.length === 0
      ? null
      : kept.reduce((best, mutation) =>
          mutation.submittedAt > best.submittedAt ? mutation : best,
        );

  const failure = newest(mutations.filter((mutation) => mutation.isError));
  if (!failure) return null;

  const success = newest(mutations.filter((mutation) => mutation.isSuccess));
  if (success && success.submittedAt > failure.submittedAt) return null;

  return apiErrorMessage(failure.error);
}
