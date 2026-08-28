import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSetItemFormat } from '@/api/items';
import { apiErrorMessage } from '@/lib/api-error';
import {
  border,
  fontFamily,
  fontSize,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  useTheme,
} from '@/theme';
import type { Item } from '@/types/api';
import { Text } from './Text';
import { useToast } from './Toast';
import { useLocale, useT } from '@/i18n/useT';

interface ProductFormatProps {
  item: Item;
}

const MAX_LENGTH = 20;

/**
 * Ce qui est écrit sur l'étiquette — « 1,5 L », « 500 g », « ×6 ».
 *
 * Placé sous le compteur de rachat, parce que c'est le seul moment où
 * l'information est fraîche : on rentre du magasin, on a le produit en main.
 * Demander à la création, c'est demander à quelqu'un qui n'a rien acheté.
 *
 * Volontairement un lien et non un champ de formulaire : il n'a jamais à être
 * rempli pour racheter. Il incite, il n'oblige pas.
 */
export function ProductFormat({ item }: Readonly<ProductFormatProps>) {
  const { colors } = useTheme();
  const locale = useLocale();
  const t = useT();
  const setFormat = useSetItemFormat();
  const toast = useToast();
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    const next = (draft ?? '').trim();
    setDraft(null);

    if (next === (item.format ?? '')) return;
    setFormat.mutate(
      { itemId: item.id, format: next },
      { onSuccess: () => toast(t('commun.formatEnregistre')) },
    );
  };

  if (draft !== null) {
    return (
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={commit}
        onBlur={commit}
        autoFocus
        selectTextOnFocus
        maxLength={MAX_LENGTH}
        returnKeyType="done"
        placeholder={t('commun.exempleFormat')}
        placeholderTextColor={colors.inkSoft}
        accessibilityLabel={t('commun.formatDuProduit')}
        style={[
          styles.input,
          { color: colors.ink, borderColor: colors.pantryTeal },
        ]}
      />
    );
  }

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          item.format
            ? `Format : ${item.format}, appuie pour corriger`
            : t('commun.preciserFormat')
        }
        onPress={() => setDraft(item.format ?? '')}
        hitSlop={spacing.xs}
        style={styles.link}
      >
        <Text variant="caption" color={item.format ? 'inkSoft' : 'pantryTeal'}>
          {item.format
            ? `Format : ${item.format} — corriger`
            : t('commun.preciserFormat')}
        </Text>
      </Pressable>

      {setFormat.isError && (
        <Text variant="caption" color="rustClay">
          {apiErrorMessage(setFormat.error, locale)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 2 },
  link: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
  input: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm,
    borderWidth: border.hairline,
    borderRadius: radius.button,
    fontFamily: fontFamily.mono,
    fontSize: fontSize.body,
  },
});
