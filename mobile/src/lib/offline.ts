import { translate } from '@/i18n';
import type { Locale } from '@/i18n/locales';

/**
 * Ce que la barre hors-ligne annonce.
 *
 * Un mode hors-ligne muet ment par omission : l'utilisateur agit, l'app paraît
 * d'accord, et rien ne dit que rien n'est parti.
 *
 * Mais un mode hors-ligne trop confiant ment tout court. Les gestes n'ont pas
 * tous la même garantie : ceux des courses sont écrits sur disque et repartent
 * après un redémarrage, ceux de l'étagère — prendre, racheter — vivent en
 * mémoire et disparaissent si l'app se ferme. Annoncer « en attente » sur les
 * seconds, ce serait remplacer une erreur silencieuse par une erreur
 * rassurante, ce qui est pire.
 *
 * D'où deux compteurs plutôt qu'un.
 */
export function offlineNotice(
  online: boolean,
  durable: number,
  volatile: number,
  locale: Locale,
): string | null {
  // En ligne, même avec des gestes en vol : on ne dit rien. Ils partent.
  if (online) return null;

  const pending = durable + volatile;
  if (pending === 0) return translate(locale, 'commun.horsLigne');

  // Dès qu'un seul geste est volatile, c'est la garantie la plus faible qui
  // gouverne le message entier : on ne trie pas les rassurances par lot.
  const key =
    volatile > 0 ? 'commun.horsLigneVolatile' : 'commun.horsLigneEnAttente';

  return translate(locale, key, { count: pending });
}

/**
 * Pourquoi la clôture des courses est refusée, ou `null` si elle est permise.
 *
 * Elle exige le réseau : c'est la seule action qui transforme des coches en
 * rachats, donc qui écrit dans le stock et dans le journal. Un bouton grisé
 * qui dit pourquoi vaut mieux qu'un inventaire doublé.
 */
export function completeBlockedReason(
  online: boolean,
  locale: Locale,
): string | null {
  return online ? null : translate(locale, 'commun.validerDemandeConnexion');
}
