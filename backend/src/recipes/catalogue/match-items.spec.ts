import { Item } from '../../items/entities/item.entity';
import { matchItem } from './match-items';

const item = (name: string): Item => ({ id: name, name }) as Item;

describe('matchItem', () => {
  const shelf = [
    item('Riz'),
    item('Huile d’olive'),
    item('Sel'),
    item('Lait'),
    item('Papier toilette'),
  ];

  it('retrouve l’item derrière une quantité et une préparation', () => {
    expect(matchItem('100 g de riz basmati', shelf)?.name).toBe('Riz');
  });

  it('ignore les accents et la casse', () => {
    expect(matchItem('2 c. à soupe d’HUILE D’OLIVE', shelf)?.name).toBe(
      'Huile d’olive',
    );
  });

  it('exige tous les mots du nom : « huile d’olive » n’est pas « huile de tournesol »', () => {
    expect(
      matchItem('2 c. à soupe d’huile de tournesol', shelf),
    ).toBeUndefined();
  });

  it('préfère le nom le plus spécifique', () => {
    const withBoth = [...shelf, item('Riz complet')];

    expect(matchItem('200 g de riz complet', withBoth)?.name).toBe(
      'Riz complet',
    );
  });

  it('n’apparie rien quand l’étagère ne suit pas l’ingrédient', () => {
    expect(matchItem('3 foie de volaille', shelf)).toBeUndefined();
  });

  it('ne se laisse pas piéger par un mot trop court', () => {
    // « sel » dans « céleri » apparierait si on ne comparait pas des mots
    // entiers.
    expect(matchItem('1 branche de céleri', shelf)).toBeUndefined();
  });

  it('refuse « lait de coco » à un item « Lait »', () => {
    // Le cas vu à l'exécution : un item d'un seul mot happait tout ingrédient
    // qui le contenait, et l'app annonçait qu'on avait du lait de coco.
    expect(matchItem('lait de coco', [item('Lait')])).toBeUndefined();
  });

  it('accepte « riz basmati » pour un item « Riz »', () => {
    // Même forme que le cas précédent — un mot en plus — mais un adjectif
    // nomme une variété, pas un autre produit.
    expect(matchItem('riz basmati', [item('Riz')])?.name).toBe('Riz');
  });

  it('accepte « lait entier »', () => {
    expect(matchItem('lait entier', [item('Lait')])?.name).toBe('Lait');
  });

  it.each([
    ['sucre de canne', 'Sucre'],
    ['huile de tournesol', 'Huile'],
    ['farine de riz', 'Farine'],
  ])('refuse « %s » à un item « %s »', (line, name) => {
    expect(matchItem(line, [item(name)])).toBeUndefined();
  });

  it('garde l’item composé quand la ligne le nomme entièrement', () => {
    // « Huile d'olive » contient lui-même une préposition : la règle ne doit
    // pas se retourner contre les items composés.
    expect(
      matchItem('2 c. à soupe d’huile d’olive', [item('Huile d’olive')])?.name,
    ).toBe('Huile d’olive');
  });

  it('reconnaît l’item derrière un conditionnement', () => {
    expect(matchItem('1 brique de lait', [item('Lait')])?.name).toBe('Lait');
  });

  it('rend undefined sur une ligne qui ne dit rien', () => {
    expect(matchItem('1', shelf)).toBeUndefined();
  });
});
