import type { Item, ItemStatus } from '@/types/api';
import { groupByUrgency, searchItems } from './group-items';

const item = (name: string, status: ItemStatus = 'available'): Item =>
  ({
    id: name,
    name,
    status,
    trackingType: 'threshold',
    quantity: null,
    lowThreshold: 1,
    targetQuantity: null,
    unit: null,
    packSize: null,
    format: null,
    groupId: 'group-1',
    lastAction: null,
  }) as Item;

describe('groupByUrgency', () => {
  it("place ce qui demande une action en tête — l'ordre EST l'information", () => {
    const sections = groupByUrgency([
      item('Café'),
      item('Litière', 'low'),
      item('Papier toilette', 'to_restock'),
    ]);

    expect(sections.map((s) => s.key)).toEqual([
      'to_restock',
      'low',
      'available',
    ]);
  });

  it('range les deux statuts épuisés ensemble', () => {
    // `out_of_stock` n'est jamais persisté, mais rien ne doit le perdre.
    const sections = groupByUrgency([
      item('Papier toilette', 'to_restock'),
      item('Ampoules', 'out_of_stock'),
    ]);

    expect(sections).toHaveLength(1);
    expect(sections[0].items.map((i) => i.name)).toEqual([
      'Ampoules',
      'Papier toilette',
    ]);
  });

  it('trie par ordre alphabétique à l’intérieur d’une section', () => {
    const [section] = groupByUrgency([
      item('Zeste'),
      item('Ail'),
      item('Miel'),
    ]);

    expect(section.items.map((i) => i.name)).toEqual(['Ail', 'Miel', 'Zeste']);
  });

  it('fait disparaître une section vide', () => {
    // Pas de « À racheter (0) » qui occupe la place sans rien dire.
    const sections = groupByUrgency([item('Café')]);

    expect(sections).toHaveLength(1);
    expect(sections[0].key).toBe('available');
  });

  it('ne renvoie rien sur une étagère vide', () => {
    expect(groupByUrgency([])).toEqual([]);
  });

  it('donne à chaque section sa couleur de statut', () => {
    const sections = groupByUrgency([
      item('A', 'to_restock'),
      item('B', 'low'),
      item('C'),
    ]);

    expect(sections.map((s) => s.color)).toEqual([
      'rustClay',
      'mustard',
      'sage',
    ]);
  });
});

describe('searchItems', () => {
  const shelf = [item('Papier toilette'), item('Café'), item('Litière')];

  it('rend la liste entière sur une recherche vide', () => {
    expect(searchItems(shelf, '   ')).toHaveLength(3);
  });

  it('ignore la casse', () => {
    expect(searchItems(shelf, 'CAFÉ').map((i) => i.name)).toEqual(['Café']);
  });

  it('trouve au milieu du nom', () => {
    expect(searchItems(shelf, 'toilette').map((i) => i.name)).toEqual([
      'Papier toilette',
    ]);
  });

  it('ignore les espaces autour', () => {
    expect(searchItems(shelf, '  café  ').map((i) => i.name)).toEqual(['Café']);
  });

  it('ne renvoie rien quand aucun nom ne correspond', () => {
    expect(searchItems(shelf, 'saucisson')).toEqual([]);
  });
});
