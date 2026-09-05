import { singleFlight } from '@/lib/single-flight';
import { useSession } from '@/store/session';
import type { AuthResponse } from '@/types/api';
import { apiRequest } from './client';

/**
 * Le renouvellement de session, et sa fermeture.
 *
 * ## Pourquoi ça existe
 *
 * L'access token vaut une heure. Sans rien derrière, une heure était aussi la
 * durée de la session : quelqu'un qui ouvre l'app trente secondes au magasin
 * retapait son mot de passe une fois sur deux. Le refresh token vaut deux mois,
 * est repoussé à chaque usage, et ne sert qu'ici.
 *
 * ## Pourquoi le groupage
 *
 * Une app qui revient au premier plan relance tout d'un coup — l'étagère, la
 * liste, le journal. Si le token vient d'expirer, chacune de ces requêtes reçoit
 * un 401 en même temps. Le serveur fait tourner le refresh token à chaque usage :
 * la deuxième à rafraîchir présenterait un token déjà consommé, ce qu'il traite
 * — à raison — comme un vol. La session serait coupée à l'instant précis où elle
 * essayait de survivre, d'où `singleFlight`.
 */
const refreshOnce = singleFlight(async (): Promise<boolean> => {
  const { refreshToken } = useSession.getState();

  // Une session écrite avant que le renouvellement existe n'en porte pas : il
  // n'y a rien à tenter, et elle se referme comme elle le faisait déjà.
  if (!refreshToken) return false;

  try {
    const renewed = await apiRequest<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });

    // Le membre vient du serveur et non du cache : entre la connexion et
    // maintenant, il a pu rejoindre un groupe depuis un autre appareil.
    await useSession.getState().renew(
      {
        accessToken: renewed.accessToken,
        refreshToken: renewed.refreshToken,
      },
      renewed.member,
    );

    return true;
  } catch {
    // Refusé, ou injoignable. Dans les deux cas il n'y a pas de session à
    // reprendre — l'appelant tranchera entre réessayer et se déconnecter.
    return false;
  }
});

/**
 * Tente de reprendre la session après un 401. Vrai si la suite peut réessayer.
 *
 * `staleToken` est le token avec lequel la requête a échoué. S'il ne ressemble
 * plus à celui du magasin, c'est qu'un renouvellement a déjà eu lieu pendant
 * qu'on échouait : il n'y a rien à refaire, seulement à réessayer avec le
 * jeton neuf. Sans cette comparaison, une rafale de 401 arrivés à quelques
 * millisecondes d'écart ferait tourner le refresh token deux fois de suite pour
 * rien.
 */
export async function renewSession(
  staleToken: string | null,
): Promise<boolean> {
  if (useSession.getState().token !== staleToken) return true;

  return refreshOnce();
}

/**
 * Ferme la session côté serveur.
 *
 * Sans attendre, et sans se plaindre : quelqu'un qui se déconnecte a déjà
 * obtenu ce qu'il voulait, l'app efface sa session de son côté quoi qu'il
 * arrive, et faire dépendre une déconnexion du réseau retiendrait dans un
 * compte celui qui essaie d'en sortir.
 */
export function revokeSession(refreshToken: string | null): void {
  if (!refreshToken) return;

  void apiRequest<void>('/auth/logout', {
    method: 'POST',
    body: { refreshToken },
  }).catch(() => undefined);
}
