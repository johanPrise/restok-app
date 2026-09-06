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
    ['available', 'ok'],
    ['low', 'low'],
    ['to_restock', 'out'],
    ['out_of_stock', 'out'],
  ])('%s → %s', (status, expected) => {
    expect(statusColor(status as ItemStatus)).toBe(expected);
  });
});

describe('statusBadge', () => {
  it('ne dit rien quand l’item ne demande rien à personne', () => {
    expect(statusBadge(item({ status: 'available' }), 'fr')).toBeNull();
  });

  it('distingue le stock bas ordinaire du bord de la rupture', () => {
    expect(
      statusBadge(
        item({ status: 'low', quantity: 5, targetQuantity: 20 }),
        'fr',
      ),
    ).toBe('Stock bas');
    expect(
      statusBadge(
        item({ status: 'low', quantity: 1, targetQuantity: 20 }),
        'fr',
      ),
    ).toBe('Critique');
  });

  it('annonce le rachat sur les deux statuts épuisés', () => {
    expect(statusBadge(item({ status: 'to_restock' }), 'fr')).toBe(
      'À racheter',
    );
    expect(statusBadge(item({ status: 'out_of_stock' }), 'fr')).toBe(
      'À racheter',
    );
  });
});

describe('relativeDate', () => {
  it('reste relatif dans la semaine', () => {
    expect(relativeDate(daysAgo(2), 'fr')).toMatch(/il y a/);
  });

  it('bascule en date absolue au-delà de sept jours', () => {
    // « il y a 3 mois » n'informe plus ; une date, si.
    expect(relativeDate(daysAgo(30), 'fr')).not.toMatch(/il y a/);
  });
});

describe('lastActionLabel', () => {
  const action = (memberName: string | null): LastAction => ({
    actionType: 'taken',
    at: daysAgo(2),
    memberName,
  });

  it('nomme celui qui a agi', () => {
    expect(lastActionLabel(action('Sam'), 'fr')).toMatch(/^Sam · il y a/);
  });

  it('anonymise sans effacer l’action quand le compte a disparu', () => {
    // L'événement a bien eu lieu : seul le nom part.
    // Apostrophe typographique : le dictionnaire l'a alignée sur le reste de
    // l'app, où « l’étagère » et « J’ai fait les courses » l'utilisent déjà.
    expect(lastActionLabel(action(null), 'fr')).toMatch(/^Quelqu’un · /);
    expect(lastActionLabel(action(null), 'en')).toMatch(/^Someone · /);
  });
});

describe('tagMeta', () => {
  const action: LastAction = {
    actionType: 'taken',
    at: daysAgo(2),
    memberName: 'Sam',
  };

  it('ne dit rien quand il n’y a ni format ni action', () => {
    expect(tagMeta(item(), 'fr')).toBeNull();
  });

  it('montre le format seul avant toute action', () => {
    expect(tagMeta(item({ format: '1,5 L' }), 'fr')).toBe('1,5 L');
  });

  it("montre l'action seule sans format", () => {
    expect(tagMeta(item({ lastAction: action }), 'fr')).toMatch(/^Sam · /);
  });

  it('met le format en premier — il dit quoi acheter', () => {
    // La dernière action décrit ce qui s'est passé ; le format sert à celui
    // qui part faire les courses.
    expect(
      tagMeta(item({ format: '1,5 L', lastAction: action }), 'fr'),
    ).toMatch(/^1,5 L · Sam · /);
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
    expect(lastActionLabel(action, 'fr', true)).not.toContain('Lea');
    expect(lastActionLabel(action, 'fr', true)).toMatch(/il y a|aujourd|\d/);
  });

  it('nomme l’auteur dès qu’ils sont plusieurs', () => {
    expect(lastActionLabel(action, 'fr')).toContain('Lea');
  });
});
