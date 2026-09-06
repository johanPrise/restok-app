import { StyleSheet, View } from 'react-native';
import { LOCALES, type Locale } from '@/i18n/locales';
import { useT } from '@/i18n/useT';
import { useLanguage } from '@/store/language';
import { spacing } from '@/theme';
import { Segmented } from './Segmented';
import { Text } from './Text';

/** `null` ne pouvant pas voyager dans un `Segmented`, on le nomme. */
const DEVICE = 'device';
type Choice = typeof DEVICE | Locale;

const NAMES: Record<Locale, string> = { fr: 'Français', en: 'English' };

/**
 * Le choix de la langue.
 *
 * Trois options, pas deux : « Appareil » est un état à part entière, pas un
 * synonyme de la langue courante. Quelqu'un qui laisse ce réglage suit son
 * téléphone — s'il le passe en anglais en voyage, l'app suit. Quelqu'un qui
 * choisit « Français » l'a dit une fois pour toutes.
 *
 * Les noms de langue ne sont **pas traduits** : « English » s'écrit English
 * dans toutes les langues, sans quoi quelqu'un dont l'app est dans une langue
 * qu'il ne lit pas ne saurait pas quoi choisir — c'est-à-dire précisément la
 * personne qui vient ici.
 */
export function LanguagePicker() {
  const t = useT();
  const chosen = useLanguage((s) => s.chosen);
  const locale = useLanguage((s) => s.locale);
  const choose = useLanguage((s) => s.choose);

  const value: Choice = chosen ?? DEVICE;

  return (
    <View style={styles.group}>
      <Segmented
        label={t('parametres.langue')}
        value={value}
        options={[
          { value: DEVICE, label: t('parametres.appareil') },
          ...LOCALES.map((code) => ({ value: code, label: NAMES[code] })),
        ]}
        onChange={(next) =>
          void choose(next === DEVICE ? null : (next as Locale))
        }
      />

      {/* Ce que « Appareil » donne aujourd'hui. Sans ça, l'option est une
          promesse dont on ne voit pas l'effet. */}
      {chosen === null && (
        <Text variant="caption" color="inkSoft">
          {t('parametres.suitLeTelephone', { nom: NAMES[locale] })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.tight },
});
