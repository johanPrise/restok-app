import type { AuthenticatedMember, MemberSummary } from '@/types/api';
import { deletionConsequences } from './account-deletion';

describe('deletionConsequences', () => {
  const me: AuthenticatedMember = {
    id: 'moi',
    name: 'Yorick',
    email: 'yorick@test.dev',
    role: 'member',
    groupId: 'group-1',
  };

  const other = (id: string, role: 'admin' | 'member'): MemberSummary =>
    ({ id, name: id, email: `${id}@test.dev`, role }) as MemberSummary;

  it('n’annonce rien à qui n’a pas de groupe', () => {
    // Quelqu'un qui vient de s'inscrire et se ravise : rien à emporter, rien à
    // transmettre.
    expect(deletionConsequences({ ...me, groupId: null }, undefined)).toEqual({
      alone: false,
      lastAdmin: false,
    });
  });

  it('n’annonce rien tant que la liste n’est pas arrivée', () => {
    // Promettre à tort qu'un groupe va disparaître serait pire que se taire.
    expect(deletionConsequences(me, undefined)).toEqual({
      alone: false,
      lastAdmin: false,
    });
  });

  it('dit que le groupe part quand on est seul dedans', () => {
    const { alone } = deletionConsequences(me, [other('moi', 'admin')]);

    expect(alone).toBe(true);
  });

  it('annonce une succession au dernier responsable', () => {
    const { alone, lastAdmin } = deletionConsequences(
      { ...me, role: 'admin' },
      [other('moi', 'admin'), other('ada', 'member')],
    );

    expect(alone).toBe(false);
    expect(lastAdmin).toBe(true);
  });

  it('n’annonce pas de succession tant qu’il reste un autre responsable', () => {
    const { lastAdmin } = deletionConsequences({ ...me, role: 'admin' }, [
      other('moi', 'admin'),
      other('ada', 'admin'),
    ]);

    expect(lastAdmin).toBe(false);
  });

  it('n’annonce pas de succession à un simple membre', () => {
    const { lastAdmin } = deletionConsequences(me, [
      other('moi', 'member'),
      other('ada', 'admin'),
    ]);

    expect(lastAdmin).toBe(false);
  });

  it('ne se compte pas lui-même parmi ceux qui restent', () => {
    // Le membre courant figure dans la liste que rend `/members` : l'oublier
    // ferait croire qu'il reste quelqu'un derrière lui.
    const { alone } = deletionConsequences({ ...me, role: 'admin' }, [
      other('moi', 'admin'),
    ]);

    expect(alone).toBe(true);
  });
});
