/**
 * Un seul appel en vol à la fois ; les suivants attendent le même résultat.
 *
 * Écrit pour le renouvellement de session. Une app qui revient au premier plan
 * relance tout d'un coup — l'étagère, la liste, le journal — et si le token a
 * expiré entre-temps, **chacune** de ces requêtes reçoit un 401 en même temps.
 * Sans coalescence, chacune irait rafraîchir de son côté : le serveur fait
 * tourner le refresh token à chaque usage, donc la deuxième présenterait un
 * token déjà consommé, et la session serait coupée pour vol au moment précis où
 * elle essayait de survivre.
 *
 * Le drapeau retombe dès que l'appel est terminé, succès ou échec : c'est un
 * groupage, pas un cache. Un renouvellement plus tard doit repartir.
 */
export function singleFlight<T>(run: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null;

  return () => {
    inFlight ??= run().finally(() => {
      inFlight = null;
    });

    return inFlight;
  };
}
