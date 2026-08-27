import { en } from './en';
import { fr } from './fr';
import { translate } from './index';
import { LOCALES } from './locales';

/** Les chemins de toutes les feuilles d'un dictionnaire : « courses.recap.one ». */
function paths(node: unknown, prefix = ''): string[] {
  if (typeof node !== 'object' || node === null) return [prefix];

  return Object.entries(node).flatMap(([key, value]) =>
    paths(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe('les dictionnaires', () => {
  /**
   * Le garde-fou du socle.
   *
   * `enableFallback` masque une clé anglaise manquante en servant le français :
   * l'app ne casse pas, elle passe silencieusement dans l'autre langue au
   * milieu d'un écran. C'est exactement le genre de trou qu'aucun écran ne
   * signale et que personne ne va chercher — d'où ce test.
   */
  it('portent exactement les mêmes clés', () => {
    expect(paths(en).sort()).toEqual(paths(fr).sort());
  });

  it('n’ont aucune phrase vide', () => {
    // Une clé vide passe la parité et n'affiche rien : le pire des deux
    // mondes, puisque l'écran se dessine sans son texte.
    for (const [nom, dictionnaire] of [
      ['fr', fr],
      ['en', en],
    ] as const) {
      const vides = paths(dictionnaire).filter((chemin) => {
        const phrase = chemin
          .split('.')
          .reduce<any>((node, key) => node[key], dictionnaire);

        return typeof phrase !== 'string' || phrase.trim() === '';
      });

      expect({ langue: nom, vides }).toEqual({ langue: nom, vides: [] });
    }
  });

  it('accordent leurs formes plurielles ensemble', () => {
    // Une clé plurielle d'un côté et simple de l'autre passerait la parité des
    // chemins mais rendrait « %{count} » brut dans une des deux langues.
    const plurals = (dict: unknown) =>
      paths(dict)
        .filter((chemin) => chemin.endsWith('.one') || chemin.endsWith('.other'))
        .sort();

    expect(plurals(en)).toEqual(plurals(fr));
  });
});

describe('translate', () => {
  it('rend la phrase de la langue demandée', () => {
    expect(translate('fr', 'onglets.courses')).toBe('Courses');
    expect(translate('en', 'onglets.courses')).toBe('Shopping');
  });

  it('interpole les valeurs nommées', () => {
    expect(translate('fr', 'acces.bienvenue', { nom: 'Sam' })).toBe(
      'Bienvenue, Sam',
    );
  });

  it('accorde le pluriel selon la langue, pas selon la clé', () => {
    // Le même appel, deux accords : le français garde le singulier à zéro.
    expect(translate('fr', 'journal.prises', { count: 0 })).toBe('0 prise');
    expect(translate('en', 'journal.prises', { count: 0 })).toBe('0 taken');

    expect(translate('fr', 'journal.rachats', { count: 3 })).toBe('3 rachats');
    expect(translate('en', 'journal.rachats', { count: 3 })).toBe('3 restocks');
  });

  it('signale bruyamment une clé qu’aucune langue ne porte', () => {
    // Le repli couvre le cas « écrite en français, pas encore en anglais » —
    // que le test de parité, lui, interdit d'atteindre ici. Reste le cas
    // qu'aucun repli ne rattrape : une clé fautive dans le code. Elle doit
    // sauter aux yeux plutôt que de laisser un blanc dans l'écran.
    const rendu = translate('en', 'clé.qui.nexiste.nulle.part');

    expect(rendu).toContain('missing');
    expect(rendu.trim()).not.toBe('');
  });

  it('ne laisse aucun `%{…}` non substitué dans une phrase sans valeur', () => {
    // Une clé qui attend une valeur et n'en reçoit pas affiche son marqueur à
    // l'écran. On vérifie ici que les phrases sans paramètre n'en portent pas.
    for (const locale of LOCALES) {
      expect(translate(locale, 'commun.horsLigne')).not.toContain('%{');
      expect(translate(locale, 'courses.rienAAcheter')).not.toContain('%{');
    }
  });
});
