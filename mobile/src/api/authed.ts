import { useSession } from '@/store/session';
import { ApiError, apiRequest, RequestOptions } from './client';

/**
 * Requête authentifiée.
 *
 * Un 401 signifie que le token ne vaut plus rien — expiré, ou compte supprimé,
 * puisque `JwtStrategy` relit le membre en base à chaque appel. On termine la
 * session ici plutôt que de laisser chaque écran le gérer.
 */
export async function authedRequest<T>(
  path: string,
  options: Omit<RequestOptions, 'token'> = {},
): Promise<T> {
  const { token, signOut } = useSession.getState();

  try {
    return await apiRequest<T>(path, { ...options, token });
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthenticated) {
      await signOut();
    }
    throw error;
  }
}
