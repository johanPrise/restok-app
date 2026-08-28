import type { ActionType, GroupHistoryEntry } from '@/types/api';
import { groupByDay, journalSummary, since } from './journal';

const entry = (
  id: string,
  createdAt: string,
  actionType: ActionType = 'taken',
): GroupHistoryEntry => ({
  id,
  actionType,
  quantity: 1,
  createdAt,
  itemId: `item-${id}`,
  itemName: 'Café en grains',
  memberName: 'Lou',
});

describe('groupByDay', () => {
  it('rassemble les actions d’une même journée sous un seul en-tête', () => {
    const days = groupByDay(
      [
        entry('a', '2026-08-24T18:00:00.000Z'),
        entry('b', '2026-08-24T09:00:00.000Z'),
        entry('c', '2026-08-23T20:00:00.000Z'),
      ],
      'fr',
    );

    expect(days).toHaveLength(2);
    expect(days[0].entries.map((e) => e.id)).toEqual(['a', 'b']);
    expect(days[1].entries.map((e) => e.id)).toEqual(['c']);
  });

  it('garde l’ordre du serveur — un registre se relit du plus récent', () => {
    const days = groupByDay(
      [
        entry('a', '2026-08-24T10:00:00.000Z'),
        entry('b', '2026-08-20T10:00:00.000Z'),
      ],
      'fr',
    );

    expect(days.map((d) => d.key)).toEqual(['2026-08-24', '2026-08-20']);
  });

  it('nomme le jour dans la langue affichée, en capitales', () => {
    const [fr] = groupByDay([entry('a', '2026-08-24T10:00:00.000Z')], 'fr');
    const [en] = groupByDay([entry('a', '2026-08-24T10:00:00.000Z')], 'en');

    expect(fr.label).toBe('24 AOÛT');
    expect(en.label).toBe('24 AUGUST');
  });

  it('tient sur un journal vide', () => {
    expect(groupByDay([], 'fr')).toEqual([]);
  });
});

describe('since', () => {
  const now = new Date('2026-08-24T12:00:00.000Z');

  it('recule de trente jours pour un mois', () => {
    expect(since('month', now)).toBe('2026-07-25T12:00:00.000Z');
  });

  it('recule de quatre-vingt-dix jours pour un trimestre', () => {
    expect(since('quarter', now)).toBe('2026-05-26T12:00:00.000Z');
  });

  it('ne pose aucune borne pour « tout »', () => {
    expect(since('all', now)).toBeUndefined();
  });
});

describe('journalSummary', () => {
  const trois = [
    entry('a', '2026-08-24T10:00:00.000Z'),
    entry('b', '2026-08-24T11:00:00.000Z'),
    entry('c', '2026-08-24T12:00:00.000Z', 'restocked'),
  ];

  it('accorde les deux nombres séparément dans une même phrase', () => {
    expect(journalSummary(trois, 'fr')).toBe('2 prises, 1 rachat');
    expect(journalSummary(trois, 'en')).toBe('2 taken, 1 restock');
  });

  /**
   * Le cas qui justifie tout le chantier : la même donnée, deux grammaires.
   * Le français garde le singulier à zéro, l'anglais le met au pluriel — et
   * ce n'est écrit nulle part dans le code, c'est `Intl.PluralRules` qui sait.
   */
  it('sépare le zéro français du zéro anglais', () => {
    expect(journalSummary([], 'fr')).toBe('0 prise, 0 rachat');
    expect(journalSummary([], 'en')).toBe('0 taken, 0 restocks');
  });
});
