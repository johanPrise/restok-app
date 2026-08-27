import { ApiError } from '@/api/client';
import { translate } from '@/i18n';
import { fr } from '@/i18n/fr';
import type { Locale } from '@/i18n/locales';

/**
 * Ce qui s'affiche quand un appel échoue.
 *
 * La règle : **on écrit pour quelqu'un qui fait ses courses**, pas pour celui
 * qui a écrit l'app. Personne n'a de serveur à redémarrer, ne sait ce qu'est un
 * 500, et n'a envie de lire « label must be longer than or equal to 2
 * characters ». Chaque message dit ce qui s'est passé et, quand il y en a une,
 * ce qu'on peut y faire.
 *
 * Un refus de règle métier arrive **nommé** : le serveur envoie un code stable
 * en plus de sa phrase, et c'est nous qui le disons dans la langue choisie —
 * lui ne peut pas la connaître, puisqu'elle se règle dans l'app. Sa phrase
 * reste le repli, pour le jour où le serveur nomme un refus que cette version
 * ne connaît pas encore.
 *
 * Ceux de la validation, eux, sont remplacés sans discuter : ils décrivent un
 * contrat d'API, pas une situation.
 */
export function apiErrorMessage(error: unknown, locale: Locale): string {
  if (!(error instanceof ApiError)) {
    // Tout ce qui n'est pas une réponse du serveur vient de `fetch` : le réseau
    // a manqué. C'est de loin le cas le plus fréquent, et le moins grave.
    return translate(locale, 'erreurs.pasDeConnexion');
  }

  // Avant le statut, et non après : un 401 se traduit d'ordinaire par « ta
  // session a expiré », ce qui n'a aucun sens sur l'écran de connexion face à
  // un mot de passe faux. Le code dit lequel des deux c'est.
  const named = businessMessage(error, locale);
  if (named !== null) return named;

  if (error.status === 401) return translate(locale, 'erreurs.sessionExpiree');
  if (error.status === 403) return translate(locale, 'erreurs.pasAcces');
  if (error.status === 404) return translate(locale, 'erreurs.disparu');
  if (error.status >= 500)
    return translate(locale, 'erreurs.cotéServeur');

  // Un refus que le serveur n'a pas nommé — ou nommé d'un code plus récent que
  // cette version de l'app. Sa phrase reste écrite pour être lue.
  if (!error.fromValidation && error.message) return error.message;

  return translate(locale, 'erreurs.pasValide');
}

/**
 * La phrase d'un refus nommé, ou `null` si le serveur n'en a pas nommé — ou
 * s'il a nommé un refus que cette version ne sait pas dire.
 *
 * Le dictionnaire français fait foi pour savoir ce qu'on sait dire : il est
 * complet par construction, là où l'anglais peut être en retard d'une phrase.
 */
function businessMessage(error: ApiError, locale: Locale): string | null {
  if (error.code === null) return null;
  if (!Object.hasOwn(fr.erreursMetier, error.code)) return null;

  return translate(locale, `erreursMetier.${error.code}`, error.values);
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
  locale: Locale,
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

  return apiErrorMessage(failure.error, locale);
}
