/**
 * Qui reprend les clés quand le dernier admin s'en va.
 *
 * ## Pourquoi une succession plutôt qu'un refus
 *
 * Le groupe refusait jusqu'ici de laisser partir son dernier admin : « nomme
 * quelqu'un d'abord ». Défendable pour un départ, intenable pour une
 * suppression de compte — on ne retient pas quelqu'un qui veut s'en aller, et
 * les stores l'exigent d'ailleurs.
 *
 * WhatsApp et Telegram ont tous deux tranché dans le même sens, après avoir eu
 * le problème avant nous : personne n'est retenu, et la place est reprise
 * d'office. Telegram propose en plus de désigner son successeur au moment de
 * partir, ce que l'app fait aussi — cette fonction n'est que le repli, pour qui
 * ne choisit pas.
 *
 * Ce que Telegram fait et qu'on ne reprend **pas** : laisser le groupe sans
 * propriétaire quand il n'y a aucun admin à qui transmettre. Ils décrivent
 * eux-mêmes un état où plus personne ne peut ajouter ni retirer qui que ce soit
 * et où « le contrôle est perdu définitivement ». C'est un cul-de-sac, pas un
 * modèle : ici, n'importe quel membre restant peut hériter.
 *
 * ## La règle
 *
 * Le membre présent dans le groupe depuis le plus longtemps — celui qui a le
 * plus de chances de savoir ce que le groupe suit et pourquoi. C'est la règle
 * de WhatsApp, qui promeut le suivant dans l'ordre d'arrivée.
 */
export interface SuccessionCandidate {
  id: string;
  /** L'entrée dans le groupe. `null` sur les comptes antérieurs à la colonne. */
  joinedAt: Date | null;
  /** L'inscription. Repli quand l'entrée n'a pas été datée. */
  createdAt: Date;
}

/**
 * Le successeur, ou `null` s'il ne reste personne.
 *
 * Le tri est **total** et non « le plus ancien » : deux membres entrés dans la
 * même seconde — deux personnes qui s'inscrivent côte à côte avec le même code
 * d'invitation — départageraient sinon au hasard des lignes rendues par
 * PostgreSQL, et la même situation promouvrait tantôt l'un tantôt l'autre.
 * L'identifiant tranche : arbitraire, mais stable, et donc testable.
 */
export function pickSuccessor(
  candidates: readonly SuccessionCandidate[],
): SuccessionCandidate | null {
  if (candidates.length === 0) return null;

  return [...candidates].sort(
    (a, b) => since(a) - since(b) || a.id.localeCompare(b.id),
  )[0];
}

/** Depuis quand il est là, au mieux de ce qu'on sait. */
function since(candidate: SuccessionCandidate): number {
  return (candidate.joinedAt ?? candidate.createdAt).getTime();
}
