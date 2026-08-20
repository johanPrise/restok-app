import type { Item, ItemStatus, LastAction } from '@/types/api';
import {
  lastActionLabel,
  relativeDate,
  statusBadge,
  statusColor,
  tagMeta,
} from './item-display';

const item = (overrides: Partial<Item> = {}): Item =>
  ({
    id: 'item-1',
    name: 'Café',
    status: 'available' as ItemStatus,
    trackingType: 'quantity',
    quantity: 6,
    lowThreshold: 2,
    targetQuantity: 12,
    unit: null,
    packSize: null,
    format: null,
    groupId: 'group-1',
    lastAction: null,
    ...overrides,
  }) as Item;

const daysAgo = (days: number): string =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

describe('statusColor', () => {
  it.each([
    ['available', 'sage'],
    ['low', 'mustard'],
    ['to_restock', 'rustClay'],
    ['out_of_stock', 'rustClay'],
  ])('%s → %s', (status, expected) => {
    expect(statusColor(status as ItemStatus)).toBe(expected);
  });
});

describe('statusBadge', () => {
  it('ne dit rien quand l’item ne demande rien à personne', () => {
    expect(statusBadge(item({ status: 'available' }))).toBeNull();
  });

  it('distingue le stock bas ordinaire du bord de la rupture', () => {
    expect(
      statusBadge(item({ status: 'low', quantity: 5, targetQuantity: 20 })),
    ).toBe('Stock bas');
    expect(
      statusBadge(item({ status: 'low', quantity: 1, targetQuantity: 20 })),
    ).toBe('Critique');
  });

  it('annonce le rachat sur les deux statuts épuisés', () => {
    expect(statusBadge(item({ status: 'to_restock' }))).toBe('À racheter');
    expect(statusBadge(item({ status: 'out_of_stock' }))).toBe('À racheter');
  });
});

describe('relativeDate', () => {
  it('reste relatif dans la semaine', () => {
    expect(relativeDate(daysAgo(2))).toMatch(/il y a/);
  });

  it('bascule en date absolue au-delà de sept jours', () => {
    // « il y a 3 mois » n'informe plus ; une date, si.
    expect(relativeDate(daysAgo(30))).not.toMatch(/il y a/);
  });
});

describe('lastActionLabel', () => {
  const action = (memberName: string | null): LastAction => ({
    actionType: 'taken',
    at: daysAgo(2),
    memberName,
  });

  it('nomme celui qui a agi', () => {
    expect(lastActionLabel(action('Sam'))).toMatch(/^Sam · il y a/);
  });

  it('anonymise sans effacer l’action quand le compte a disparu', () => {
    // L'événement a bien eu lieu : seul le nom part.
    expect(lastActionLabel(action(null))).toMatch(/^Quelqu'un · /);
  });
});

describe('tagMeta', () => {
  const action: LastAction = {
    actionType: 'taken',
    at: daysAgo(2),
    memberName: 'Sam',
  };

  it('ne dit rien quand il n’y a ni format ni action', () => {
    expect(tagMeta(item())).toBeNull();
  });

  it('montre le format seul avant toute action', () => {
    expect(tagMeta(item({ format: '1,5 L' }))).toBe('1,5 L');
  });

  it("montre l'action seule sans format", () => {
    expect(tagMeta(item({ lastAction: action }))).toMatch(/^Sam · /);
  });

  it('met le format en premier — il dit quoi acheter', () => {
    // La dernière action décrit ce qui s'est passé ; le format sert à celui
    // qui part faire les courses.
    expect(tagMeta(item({ format: '1,5 L', lastAction: action }))).toMatch(
      /^1,5 L · Sam · /,
    );
  });
});

describe('en solo, l’auteur disparaît', () => {
  const action = {
    actionType: 'taken' as const,
    at: new Date().toISOString(),
    memberName: 'Lea',
  };

  it('ne garde que la date', () => {
    // Le nom est toujours le même : il n'apprend rien, la date si.
    expect(lastActionLabel(action, true)).not.toContain('Lea');
    expect(lastActionLabel(action, true)).toMatch(/il y a|aujourd|\d/);
  });

  it('nomme l’auteur dès qu’ils sont plusieurs', () => {
    expect(lastActionLabel(action)).toContain('Lea');
  });
});
