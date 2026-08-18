/**
 * Ce que la barre hors-ligne annonce.
 *
 * Un mode hors-ligne muet ment : l'utilisateur coche, l'app paraît d'accord, et
 * rien ne dit que rien n'est parti. Le compte des gestes en attente est la
 * seule chose qui rende la file croyable.
 */
export function offlineNotice(online: boolean, pending: number): string | null {
  if (online) {
    // En ligne avec des gestes encore en vol : on ne dit rien. Ils partent.
    return null;
  }

  if (pending === 0) return 'Hors-ligne — tes gestes seront envoyés au retour';

  return `Hors-ligne — ${pending} geste${pending > 1 ? 's' : ''} en attente`;
}

/**
 * Pourquoi la clôture des courses est refusée, ou `null` si elle est permise.
 *
 * Elle exige le réseau : c'est la seule action qui transforme des coches en
 * rachats, donc qui écrit dans le stock et dans le journal. Un bouton grisé
 * qui dit pourquoi vaut mieux qu'un inventaire doublé.
 */
export function completeBlockedReason(online: boolean): string | null {
  return online ? null : 'Valider les courses demande une connexion';
}
