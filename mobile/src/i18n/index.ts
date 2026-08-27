import { I18n } from 'i18n-js';
import { en } from './en';
import { fr } from './fr';
import { FALLBACK, pluralCategory, type Locale } from './locales';

const i18n = new I18n({ fr, en });

// Une phrase absente d'une langue tombe sur le français, qui est complet par
// construction — plutôt que d'afficher la clé nue à quelqu'un qui fait ses
// courses.
i18n.enableFallback = true;
i18n.defaultLocale = FALLBACK;

/**
 * La règle de pluriel, déléguée à `Intl`.
 *
 * `i18n-js` embarque la sienne, et elle est anglaise : elle range zéro au
 * pluriel. En français, « 0 article coché » est au singulier. Plutôt que de
 * décrire la grammaire de chaque langue à la main — ce que le projet faisait
 * en trois endroits sous la forme `count < 2` — on la demande au moteur, qui
 * la connaît pour toutes.
 */
i18n.pluralization.register(FALLBACK, (_i18n, count) => [
  pluralCategory('fr', count),
]);
i18n.pluralization.register('en', (_i18n, count) => [
  pluralCategory('en', count),
]);

export type Values = Record<string, string | number>;

/**
 * Traduire, hors composant.
 *
 * Prend la langue en paramètre plutôt que de la lire dans le magasin. Ce n'est
 * pas qu'une commodité de test : le magasin s'adosse à `AsyncStorage`, un
 * module natif, et le faire remonter jusqu'ici mettrait un module natif dans
 * la dépendance de chaque fonction de `src/lib`. Les hooks vivent donc à côté,
 * dans `useT.ts` — eux seuls connaissent le magasin.
 */
export function translate(
  locale: Locale,
  key: string,
  values?: Values,
): string {
  i18n.locale = locale;

  return i18n.t(key, values);
}

