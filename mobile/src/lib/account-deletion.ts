import type { AuthenticatedMember, MemberSummary } from '@/types/api';

/**
 * Ce que la suppression d'un compte va emporter avec elle.
 *
 * Dire « c'est irréversible » ne suffit pas : ce qui compte, pour décider,
 * c'est **ce qui arrive aux autres**. Le groupe disparaît-il ? Quelqu'un
 * hérite-t-il des clés sans l'avoir demandé ? Ces deux phrases-là ne
 * s'affichent que quand elles sont vraies, sinon elles deviennent un décor que
 * personne ne lit.
 *
 * Le serveur reste seul juge — il refait le calcul avec la liste à jour. Ceci
 * ne sert qu'à écrire l'avertissement.
 */
export interface DeletionConsequences {
  /** Le groupe part avec lui : il n'y a personne d'autre dedans. */
  alone: boolean;
  /** Il tient seul les commandes : quelqu'un va hériter. */
  lastAdmin: boolean;
}

export function deletionConsequences(
  member: AuthenticatedMember | null,
  members: readonly MemberSummary[] | undefined,
): DeletionConsequences {
  // Sans groupe, il n'y a rien à emporter ni à transmettre — le cas de
  // quelqu'un qui vient de s'inscrire et se ravise.
  if (!member?.groupId) return { alone: false, lastAdmin: false };

  // La liste n'est pas encore arrivée : on n'annonce rien plutôt que de
  // promettre à tort qu'un groupe va disparaître.
  if (!members) return { alone: false, lastAdmin: false };

  const others = members.filter((other) => other.id !== member.id);

  if (others.length === 0) return { alone: true, lastAdmin: false };

  return {
    alone: false,
    lastAdmin:
      member.role === 'admin' &&
      !others.some((other) => other.role === 'admin'),
  };
}
