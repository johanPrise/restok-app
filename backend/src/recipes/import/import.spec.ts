import { readFileSync } from 'fs';
import { join } from 'path';
import { Item } from '../../items/entities/item.entity';
import { matchItem } from './match-items';
import { parseRecipePage } from './recipe-page';

const item = (name: string): Item => ({ id: name, name }) as Item;

describe('parseRecipePage', () => {
  const marmiton = readFileSync(
    join(__dirname, '../../../test/fixtures/marmiton.html'),
    'utf-8',
  );

  it('lit une vraie page Marmiton', () => {
    // Fixture capturée sur le site : si Marmiton change de mise en page, ce
    // test reste vert — on lit ses données structurées, pas son HTML.
    const recipe = parseRecipePage(marmiton);

    expect(recipe?.name).toContain('Fricassée de poulet');
    expect(recipe?.ingredients.length).toBeGreaterThan(5);
    expect(recipe?.ingredients[0]).toBe('1 poulet coupé en morceaux');
  });

  it('rend les étapes une par ligne, prêtes à afficher', () => {
    const steps = parseRecipePage(marmiton)?.steps ?? '';

    expect(steps.split('\n').length).toBeGreaterThan(3);
    expect(steps.length).toBeGreaterThan(100);
  });

  it('trouve la recette imbriquée dans un @graph', () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      '@graph': [
        { '@type': 'WebSite' },
        { '@type': 'Recipe', name: 'Salade', recipeIngredient: ['Thon'] },
      ],
    })}</script>`;

    expect(parseRecipePage(html)?.name).toBe('Salade');
  });

  it('accepte un @type multiple', () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      '@type': ['Recipe', 'NewsArticle'],
      name: 'Salade',
    })}</script>`;

    expect(parseRecipePage(html)?.name).toBe('Salade');
  });

  it('déplie les sections d’étapes', () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Recipe',
      name: 'Salade',
      recipeInstructions: [
        {
          '@type': 'HowToSection',
          itemListElement: [
            { '@type': 'HowToStep', text: 'Laver' },
            { '@type': 'HowToStep', text: 'Mélanger' },
          ],
        },
      ],
    })}</script>`;

    expect(parseRecipePage(html)?.steps).toBe('Laver\nMélanger');
  });

  it('lit le nombre de parts au milieu du texte', () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Recipe',
      name: 'Salade',
      recipeYield: '4 personnes',
    })}</script>`;

    expect(parseRecipePage(html)?.servings).toBe(4);
  });

  it('ignore un bloc invalide sans renoncer aux suivants', () => {
    const html =
      '<script type="application/ld+json">{ pas du json</script>' +
      `<script type="application/ld+json">${JSON.stringify({
        '@type': 'Recipe',
        name: 'Salade',
      })}</script>`;

    expect(parseRecipePage(html)?.name).toBe('Salade');
  });

  it('rend null quand la page ne publie rien — l’appelant retombe sur la saisie', () => {
    expect(parseRecipePage('<html><body>rien</body></html>')).toBeNull();
  });
});

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

  it('rend undefined sur une ligne qui ne dit rien', () => {
    expect(matchItem('1', shelf)).toBeUndefined();
  });
});
