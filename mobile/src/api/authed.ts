import { useSession } from '@/store/session';
import { ApiError, apiRequest, apiText, RequestOptions } from './client';
import { purgePersistedCache } from './persist';
import { queryClient } from './query-client';
import { renewSession } from './session';

/**
 * Requête authentifiée, avec renouvellement de session et correction du cache.
 *
 * - **401** : l'access token ne vaut plus rien. On tente de le renouveler
 *   silencieusement avec le refresh token, et on rejoue la requête une fois —
 *   la personne ne voit rien passer. Ce n'est que si le renouvellement échoue
 *   que la session se termine : le token n'a alors pas seulement expiré, il a
 *   été révoqué, ou le compte a disparu.
 * - **403** sur une route « membre » : le serveur dit que l'appelant n'a pas de
 *   groupe alors que la session locale en mémorise un. C'est le cas d'un membre
 *   retiré depuis un autre appareil ; on aligne la session sur le serveur, qui
 *   fait foi.
 */
export async function authedRequest<T>(
  path: string,
  options: Omit<RequestOptions, 'token'> = {},
): Promise<T> {
  return attempt((token) => apiRequest<T>(path, { ...options, token }));
}

/** Comme `authedRequest`, pour une réponse qui n'est pas du JSON. */
export async function authedText(path: string): Promise<string> {
  return attempt((token) => apiText(path, { token }));
}

/**
 * Un essai, un renouvellement, un second essai — puis on renonce.
 *
 * Le token est relu au second essai plutôt que capturé une fois : c'est tout
 * l'intérêt de ce second essai, qui doit partir avec celui que le
 * renouvellement vient d'écrire.
 */
async function attempt<T>(
  send: (token: string | null) => Promise<T>,
): Promise<T> {
  const { token } = useSession.getState();

  try {
    return await send(token);
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;

    if (error.isUnauthenticated && (await renewSession(token))) {
      return await retry(send);
    }

    await reconcileSession(error);
    throw error;
  }
}

/**
 * Le second essai, avec le jeton neuf. Une seule reprise, jamais de boucle : un
 * serveur qui répond 401 à un token qu'il vient d'émettre ne dira pas autre
 * chose la troisième fois.
 *
 * Il passe par la même réconciliation que le premier, et ce n'est pas un
 * détail : sans elle, un compte supprimé entre les deux essais laissait l'app
 * avec une session que le serveur refuse — et chaque écran repartait
 * indéfiniment dans le même renouvellement inutile.
 */
async function retry<T>(
  send: (token: string | null) => Promise<T>,
): Promise<T> {
  try {
    return await send(useSession.getState().token);
  } catch (error) {
    if (error instanceof ApiError) await reconcileSession(error);
    throw error;
  }
}

async function reconcileSession(error: ApiError): Promise<void> {
  const { member, signOut, setMember } = useSession.getState();

  if (error.isUnauthenticated) {
    // On arrive ici renouvellement tenté et échoué : la session est bel et bien
    // finie, pas seulement expirée.
    // Rien à révoquer côté serveur : c'est lui qui vient de refuser.
    await signOut();
    // Le cache appartient au compte qui vient de sauter. Sans ce vidage, le
    // prochain à se connecter voyait l'étagère du précédent le temps d'un
    // refetch — `staleTime` la tient trente secondes.
    queryClient.clear();
    // Et sur disque, où elle survivrait maintenant au redémarrage.
    purgePersistedCache();
    return;
  }

  if (error.status === 403 && member?.groupId) {
    await setMember({ ...member, groupId: null, role: 'member' });
    // Idem pour un membre retiré de son groupe : les items, l'historique et la
    // liste des membres ne le regardent plus.
    queryClient.clear();
    purgePersistedCache();
  }
}
