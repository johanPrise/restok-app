import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import { FALLBACK, isLocale, type Locale } from '@/i18n/locales';

const LANGUAGE_KEY = 'restock.language';

interface LanguageState {
  /** La langue effective : le choix explicite, ou celle de l'appareil. */
  locale: Locale;
  /** `null` tant que personne n'a choisi — l'appareil décide alors. */
  chosen: Locale | null;
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  /** `null` pour revenir à la langue de l'appareil. */
  choose: (locale: Locale | null) => Promise<void>;
}

/**
 * Ce que l'appareil demande.
 *
 * `getLocales()` rend la **langue** réglée sur le téléphone, pas le pays où il
 * se trouve : un francophone à New York obtient le français, et un anglophone
 * installé à Rome obtient l'anglais. C'est le bon comportement — les gens
 * voyagent, les langues non.
 *
 * La liste est parcourue dans l'ordre : quelqu'un dont le téléphone liste
 * l'italien puis l'anglais obtiendra l'anglais, sa deuxième préférence, plutôt
 * que le français par défaut.
 */
function fromDevice(): Locale {
  for (const { languageCode } of getLocales()) {
    if (isLocale(languageCode)) return languageCode;
  }

  return FALLBACK;
}

/**
 * La langue de l'app.
 *
 * Séparée de la session, et volontairement : la langue n'appartient pas à un
 * compte. Se déconnecter ne doit pas rendre l'app à une langue qu'on ne lit
 * pas — c'est précisément l'écran où l'on aurait besoin de comprendre.
 *
 * Dans `AsyncStorage` et non dans le trousseau : une préférence de langue
 * n'est pas un secret, et `secureStorage` est réservé au jeton de session.
 */
export const useLanguage = create<LanguageState>((set) => ({
  locale: fromDevice(),
  chosen: null,
  isHydrated: false,

  hydrate: async () => {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    const chosen = isLocale(stored) ? stored : null;

    set({ chosen, locale: chosen ?? fromDevice(), isHydrated: true });
  },

  choose: async (locale) => {
    if (locale === null) await AsyncStorage.removeItem(LANGUAGE_KEY);
    else await AsyncStorage.setItem(LANGUAGE_KEY, locale);

    set({ chosen: locale, locale: locale ?? fromDevice() });
  },
}));

/** Pour le code hors composant, qui n'a pas de rendu où s'abonner. */
export function currentLocale(): Locale {
  return useLanguage.getState().locale;
}
