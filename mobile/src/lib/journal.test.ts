import type { ActionType, GroupHistoryEntry } from '@/types/api';
import {
  groupByDay,
  isTruncated,
  journalSummary,
  since,
} from './journal';

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
    const days = groupByDay([
      entry('a', '2026-08-24T18:00:00.000Z'),
      entry('b', '2026-08-24T09:00:00.000Z'),
      entry('c', '2026-08-23T20:00:00.000Z'),
    ]);

    expect(days).toHaveLength(2);
    expect(days[0].entries.map((e) => e.id)).toEqual(['a', 'b']);
    expect(days[1].entries.map((e) => e.id)).toEqual(['c']);
  });

  it('garde l’ordre du serveur — un registre se relit du plus récent', () => {
    const days = groupByDay([
      entry('a', '2026-08-24T10:00:00.000Z'),
      entry('b', '2026-08-20T10:00:00.000Z'),
    ]);

    expect(days.map((d) => d.key)).toEqual(['2026-08-24', '2026-08-20']);
  });

  it('nomme le jour en français, en capitales', () => {
    const [day] = groupByDay([entry('a', '2026-08-24T10:00:00.000Z')]);

    expect(day.label).toBe('24 AOÛT');
  });

  it('tient sur un journal vide', () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe('isTruncated', () => {
  it('avertit dès que le plafond est atteint', () => {
    expect(isTruncated([entry('a', '2026-08-24T10:00:00.000Z')], 1)).toBe(true);
  });

  it('se tait en dessous', () => {
    expect(isTruncated([entry('a', '2026-08-24T10:00:00.000Z')], 2)).toBe(false);
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
  it('compte les prises et les rachats séparément', () => {
    expect(
      journalSummary([
        entry('a', '2026-08-24T10:00:00.000Z'),
        entry('b', '2026-08-24T11:00:00.000Z'),
        entry('c', '2026-08-24T12:00:00.000Z', 'restocked'),
      ]),
    ).toBe('2 prises, 1 rachat');
  });

  it('garde le singulier à zéro, comme le veut le français', () => {
    expect(journalSummary([])).toBe('0 prise, 0 rachat');
  });
});
