import { HINTS, type HintContext, learnedFrom, nextHint } from './hints';

const context = (overrides: Partial<HintContext> = {}): HintContext => ({
  learned: {},
  screen: 'shelf',
  itemCount: 3,
  checkedCount: 0,
  recipeCount: 0,
  isAdmin: true,
  ...overrides,
});

describe('nextHint', () => {
  it('enseigne le balayage sur une étagère qui a des tags', () => {
    expect(nextHint(context())).toBe('swipe');
  });

  it('se tait sur une étagère vide', () => {
    // Un geste s'explique là où il s'exerce. L'écran vide a déjà sa phrase —
    // « ajoute le premier item » — et n'a pas besoin d'une seconde.
    expect(nextHint(context({ itemCount: 0 }))).toBeNull();
  });

  it('ne montre qu’un seul repère, même quand deux sont prêts', () => {
    // Sur l'étagère, le balayage et le renommage sont prêts en même temps.
    // Trois repères qui s'allument le même jour font une visite guidée.
    expect(nextHint(context())).toBe('swipe');
  });

  it('laisse le suivant passer une fois le premier appris', () => {
    expect(nextHint(context({ learned: { swipe: true } }))).toBe('rename');
  });

  it('se tait quand tout est appris', () => {
    const learned = Object.fromEntries(HINTS.map((id) => [id, true]));

    expect(nextHint(context({ learned }))).toBeNull();
  });
});

describe('nextHint — le moment de chaque repère', () => {
  it('n’annonce la clôture qu’une fois quelque chose de coché', () => {
    // Avant la première coche, « ça repart en stock » ne désigne rien.
    expect(nextHint(context({ screen: 'shopping' }))).toBeNull();
    expect(nextHint(context({ screen: 'shopping', checkedCount: 1 }))).toBe(
      'shoppingLoop',
    );
  });

  it('n’annonce le tri qu’à partir de trois recettes', () => {
    // En dessous, « c'est trié » décrit un ordre que l'œil ne peut pas
    // vérifier — donc une affirmation invérifiable.
    const recipes = (recipeCount: number) =>
      nextHint(context({ screen: 'recipes', recipeCount }));

    expect(recipes(2)).toBeNull();
    expect(recipes(3)).toBe('recipeSort');
  });

  it('ne propose pas de renommer à qui n’en a pas le droit', () => {
    expect(
      nextHint(context({ learned: { swipe: true }, isAdmin: false })),
    ).toBeNull();
  });
});

describe('nextHint — chaque repère reste chez lui', () => {
  it('ne sort jamais un repère sur l’écran d’un autre', () => {
    // Le balayage n'a rien à dire dans les courses, même jamais appris. Sans
    // ça, un repère paraîtrait loin du geste qu'il enseigne — et c'est
    // exactement ce qu'on reproche aux visites guidées.
    const ailleurs = nextHint(
      context({ screen: 'shopping', checkedCount: 0, recipeCount: 9 }),
    );

    expect(ailleurs).toBeNull();
  });

  it('n’est pas bloqué par un repère jamais appris ailleurs', () => {
    // Quelqu'un qui n'a jamais balayé doit quand même apprendre la clôture :
    // sinon un seul geste manquant condamnerait tous les autres repères.
    expect(nextHint(context({ screen: 'shopping', checkedCount: 2 }))).toBe(
      'shoppingLoop',
    );
  });
});

describe('learnedFrom — la migration des sessions déjà sur l’appareil', () => {
  it('reprend l’ancien drapeau du balayage', () => {
    // Sans ça, la mise à jour se manifesterait par une régression : tous ceux
    // qui connaissent le geste le réapprendraient.
    expect(learnedFrom({ swipeLearned: true })).toEqual({ swipe: true });
  });

  it('ne retient rien d’un drapeau à faux', () => {
    expect(learnedFrom({ swipeLearned: false })).toEqual({});
  });

  it('laisse la nouvelle forme intacte quand elle est là', () => {
    const learned = { swipe: true, recipeSort: true };

    expect(learnedFrom({ learned, swipeLearned: false })).toEqual(learned);
  });

  it('tient sur une session absente ou vierge', () => {
    expect(learnedFrom(null)).toEqual({});
    expect(learnedFrom({})).toEqual({});
  });
});
