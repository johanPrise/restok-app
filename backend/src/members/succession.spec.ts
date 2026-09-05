import { pickSuccessor, SuccessionCandidate } from './succession';

describe('pickSuccessor', () => {
  const at = (iso: string) => new Date(iso);

  const candidate = (
    id: string,
    joinedAt: string | null,
    createdAt = '2020-01-01T00:00:00Z',
  ): SuccessionCandidate => ({
    id,
    joinedAt: joinedAt ? at(joinedAt) : null,
    createdAt: at(createdAt),
  });

  it('promeut le membre présent depuis le plus longtemps', () => {
    const successor = pickSuccessor([
      candidate('c', '2026-03-01T00:00:00Z'),
      candidate('a', '2026-01-01T00:00:00Z'),
      candidate('b', '2026-02-01T00:00:00Z'),
    ]);

    expect(successor?.id).toBe('a');
  });

  it('ne promeut personne quand il ne reste plus personne', () => {
    expect(pickSuccessor([])).toBeNull();
  });

  it('compte l’entrée dans le groupe, pas l’inscription', () => {
    const successor = pickSuccessor([
      // Inscrit il y a des années, mais arrivé hier.
      candidate('ancien', '2026-09-01T00:00:00Z', '2020-01-01T00:00:00Z'),
      // Inscrit récemment, mais dans le groupe depuis six mois.
      candidate('present', '2026-03-01T00:00:00Z', '2026-03-01T00:00:00Z'),
    ]);

    // Sans `joinedAt`, « ancien » aurait hérité d'un groupe qu'il découvre.
    expect(successor?.id).toBe('present');
  });

  it('retombe sur l’inscription quand l’entrée n’a pas été datée', () => {
    const successor = pickSuccessor([
      candidate('recent', null, '2026-05-01T00:00:00Z'),
      candidate('ancien', null, '2026-01-01T00:00:00Z'),
    ]);

    // Les comptes antérieurs à la colonne : la migration les a remplis, mais un
    // membre sans groupe qui en rejoint un plus tard passerait ici.
    expect(successor?.id).toBe('ancien');
  });

  it('départage deux entrées simultanées de façon stable', () => {
    const ensemble = [
      candidate('zoe', '2026-01-01T00:00:00Z'),
      candidate('alix', '2026-01-01T00:00:00Z'),
    ];

    // Deux personnes qui s'inscrivent côte à côte avec le même code : sans
    // départage, PostgreSQL promouvrait tantôt l'une tantôt l'autre.
    expect(pickSuccessor(ensemble)?.id).toBe('alix');
    expect(pickSuccessor([...ensemble].reverse())?.id).toBe('alix');
  });

  it('ne réordonne pas la liste qu’on lui donne', () => {
    const ensemble = [
      candidate('c', '2026-03-01T00:00:00Z'),
      candidate('a', '2026-01-01T00:00:00Z'),
    ];

    pickSuccessor(ensemble);

    expect(ensemble.map((m) => m.id)).toEqual(['c', 'a']);
  });
});
