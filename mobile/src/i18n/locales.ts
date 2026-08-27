import { enUS, fr } from 'date-fns/locale';
import type { Locale as DateLocale } from 'date-fns';

/** Les langues réellement écrites. En ajouter une, c'est écrire un dictionnaire. */
export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * Le repli. Le français, parce que c'est la langue dans laquelle l'app a été
 * pensée : une phrase manquante y est complète et juste, là où une traduction
 * anglaise absente laisserait une clé nue.
 */
export const FALLBACK: Locale = 'fr';

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

/**
 * Les locales de `date-fns`, indexées par langue.
 *
 * Une table plutôt qu'un import dynamique : Metro empaquette statiquement, et
 * un `import()` calculé embarquerait les cinquante locales de la bibliothèque
 * pour n'en utiliser qu'une.
 */
const DATE_LOCALES: Record<Locale, DateLocale> = { fr, en: enUS };

export function dateLocale(locale: Locale): DateLocale {
  return DATE_LOCALES[locale];
}

/**
 * Le comparateur de tri.
 *
 * `Intl.Collator` plutôt que `localeCompare(…, 'fr')` codé en dur : c'est la
 * même chose, mais la langue vient de l'utilisateur. Il range « Éclair » avec
 * les E en français, et « Ärger » avec les A en allemand le jour où l'allemand
 * existera — sans qu'on ait à connaître ces règles.
 *
 * L'instance est mémorisée : construire un `Collator` coûte, et trier une
 * étagère en appelle un par comparaison.
 */
const collators = new Map<Locale, Intl.Collator>();

export function collator(locale: Locale): Intl.Collator {
  const kept = collators.get(locale);
  if (kept) return kept;

  const made = new Intl.Collator(locale);
  collators.set(locale, made);

  return made;
}

/**
 * `Intl` est-il vraiment là ?
 *
 * Hermes l'embarque, mais son binaire est téléchargé à la compilation : on ne
 * peut pas le vérifier depuis le dépôt, seulement depuis un build. Plutôt que
 * de parier, on regarde — et on choisit **de crier en développement, de se
 * replier en production**. Un mauvais pluriel ne vaut pas un plantage chez
 * quelqu'un qui fait ses courses ; il vaut en revanche qu'on le voie ici.
 */
export const HAS_INTL =
  typeof Intl?.PluralRules === 'function' &&
  typeof Intl?.Collator === 'function';

export function compare(locale: Locale, a: string, b: string): number {
  if (HAS_INTL) return collator(locale).compare(a, b);

  return a.localeCompare(b, locale);
}

/**
 * La forme grammaticale d'un nombre : `'one'`, `'other'`, et en d'autres
 * langues `'few'` ou `'many'`.
 *
 * C'est ici que se règle la divergence qui a coûté un défaut hier : en
 * français, **zéro est au singulier** — « 0 article coché » — alors qu'en
 * anglais il est au pluriel — « 0 items checked ». `Intl.PluralRules` connaît
 * les deux règles, et toutes les autres. On cesse donc d'écrire `count < 2`.
 *
 * `type: 'cardinal'` explicitement : le défaut, mais l'ordinal existe et la
 * confusion est silencieuse.
 */
const pluralRules = new Map<Locale, Intl.PluralRules>();

export function pluralCategory(
  locale: Locale,
  count: number,
): Intl.LDMLPluralRule {
  if (!HAS_INTL) return fallbackCategory(locale, count);

  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale, { type: 'cardinal' });
    pluralRules.set(locale, rules);
  }

  return rules.select(count);
}

/**
 * Le repli, si `Intl` manquait. Il ne connaît que nos deux langues, et c'est
 * exactement pour ça qu'il est un repli : il redeviendrait faux à la troisième.
 *
 * En développement, on préfère l'erreur au silence — c'est le seul moment où
 * quelqu'un peut encore corriger la cause.
 */
function fallbackCategory(
  locale: Locale,
  count: number,
): Intl.LDMLPluralRule {
  if (__DEV__) {
    throw new Error(
      "Intl.PluralRules est absent de ce moteur : les pluriels seraient devinés. Vérifie la configuration de Hermes avant d'aller plus loin.",
    );
  }

  // Le français garde le singulier à zéro, l'anglais non.
  const singulier = locale === 'fr' ? count < 2 : count === 1;

  return singulier ? 'one' : 'other';
}
