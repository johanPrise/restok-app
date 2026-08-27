import { useLanguage } from '@/store/language';
import { translate, type Values } from './index';
import type { Locale } from './locales';

/**
 * Traduire, dans un composant.
 *
 * Séparé de `translate` pour que `src/lib` n'ait pas à connaître le magasin —
 * et donc `AsyncStorage`, qui est un module natif. Ici c'est légitime : un
 * composant vit déjà dans l'app.
 *
 * S'abonne à la langue : en changer dans les réglages redessine les écrans,
 * sans redémarrage.
 */
export function useT() {
  const locale = useLanguage((s) => s.locale);

  return (key: string, values?: Values) => translate(locale, key, values);
}

/** La langue courante, pour ce qui en a besoin autrement que pour traduire. */
export function useLocale(): Locale {
  return useLanguage((s) => s.locale);
}
