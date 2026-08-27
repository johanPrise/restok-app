import {
  collator,
  compare,
  dateLocale,
  HAS_INTL,
  isLocale,
  LOCALES,
  pluralCategory,
} from './locales';

describe('isLocale', () => {
  it('reconnaît les langues réellement écrites', () => {
    expect(isLocale('fr')).toBe(true);
    expect(isLocale('en')).toBe(true);
  });

  it('refuse tout le reste, y compris ce qui vient de l’appareil', () => {
    // `getLocales()` rend ce que le téléphone dit, pas ce qu'on sait traduire.
    expect(isLocale('de')).toBe(false);
    expect(isLocale('fr-CA')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});

describe('pluralCategory', () => {
  // C'est le défaut qui a motivé tout le socle : la règle `count < 2` était
  // écrite en trois endroits, et elle est fausse dès qu'on quitte le français.
  it('range zéro au singulier en français, au pluriel en anglais', () => {
    expect(pluralCategory('fr', 0)).toBe('one');
    expect(pluralCategory('en', 0)).toBe('other');
  });

  it('s’accorde sur un dans les deux langues', () => {
    expect(pluralCategory('fr', 1)).toBe('one');
    expect(pluralCategory('en', 1)).toBe('one');
  });

  it('passe au pluriel à partir de deux', () => {
    for (const locale of LOCALES) {
      expect(pluralCategory(locale, 2)).toBe('other');
      expect(pluralCategory(locale, 17)).toBe('other');
    }
  });

  it('tient sur les décimaux, que `count < 2` classait au singulier', () => {
    // « 1,5 litre » en français, « 1.5 litres » en anglais.
    expect(pluralCategory('fr', 1.5)).toBe('one');
    expect(pluralCategory('en', 1.5)).toBe('other');
  });
});

describe('compare', () => {
  it('range les accents à leur lettre, pas après tout l’alphabet', () => {
    // Le tri de l'étagère passe par là : « Éclair » entre « Eau » et « Farine »,
    // là où une comparaison de codepoints l'aurait jeté à la fin.
    const sorted = ['Farine', 'Éclair', 'Eau'].sort((a, b) =>
      compare('fr', a, b),
    );

    expect(sorted).toEqual(['Eau', 'Éclair', 'Farine']);
  });

  it('ignore la casse comme le fait un rayon de magasin', () => {
    expect(compare('fr', 'café', 'Café')).toBeLessThanOrEqual(0);
  });

  it('mémorise ses comparateurs — trier une étagère en appelle un par paire', () => {
    expect(collator('fr')).toBe(collator('fr'));
    expect(collator('fr')).not.toBe(collator('en'));
  });
});

describe('dateLocale', () => {
  it('donne à chaque langue la sienne, sans import dynamique', () => {
    // Une table plutôt qu'un `import()` calculé : Metro empaquette
    // statiquement, et le calcul embarquerait les cinquante locales.
    expect(dateLocale('fr').code).toBe('fr');
    expect(dateLocale('en').code).toBe('en-US');
  });
});

describe('HAS_INTL', () => {
  it('est vrai partout où les tests tournent', () => {
    // S'il tombait à faux ici, le repli prendrait la main et les cas
    // ci-dessus ne prouveraient plus rien de ce qu'ils prétendent prouver.
    expect(HAS_INTL).toBe(true);
  });
});
