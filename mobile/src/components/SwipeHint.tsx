import { Pressable, StyleSheet, View } from 'react-native';
import { emphase } from '@/i18n/emphase';
import { useT } from '@/i18n/useT';
import { border, radius, spacing, useTheme } from '@/theme';
import { Text } from './Text';

/**
 * Le repère qui enseigne le geste central de l'app.
 *
 * Prendre et racheter passent par un **balayage**, et un balayage ne se voit
 * pas : rien sur un tag ne dit qu'on peut le tirer. Jusqu'ici l'app l'annonçait
 * par `accessibilityHint` — donc aux lecteurs d'écran, et à personne d'autre.
 *
 * Il se pose au-dessus du premier tag plutôt que dans un carrousel à
 * l'inscription : on retient un geste là où il sert, pas trois écrans avant.
 * Et il disparaît **au premier balayage réussi** — le jour où il a fait son
 * travail, il n'a plus rien à dire.
 */
export function SwipeHint({ onDismiss }: Readonly<{ onDismiss: () => void }>) {
  const { colors } = useTheme();
  const t = useT();

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.block,
        { backgroundColor: colors.paperRaised, borderColor: colors.pantryTeal },
      ]}
    >
      <View style={styles.row}>
        <Text variant="monoLabel" color="pantryTeal">{t('geste.titre')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('commun.masquerBalayage')}
          hitSlop={spacing.xs}
          onPress={onDismiss}
        >
          <Text variant="monoLabel" color="inkSoft">
            {t('geste.compris')}
          </Text>
        </Pressable>
      </View>

      {/* Les deux sens sont nommés dans l'ordre où ils arrivent : on vide bien
          plus souvent qu'on ne remplit. Les astérisques de la traduction
          marquent ce qui passe en gras — voir `emphase`. */}
      <Text variant="body">
        {emphase(t('geste.explication'))}
      </Text>
    </View>
  );
}


const styles = StyleSheet.create({
  block: {
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: border.hairline,
    borderRadius: radius.tag,
    // Le coin corné des tags : le repère appartient à l'étagère, il n'est pas
    // une notification venue d'ailleurs.
    borderBottomRightRadius: radius.tagFoldedCorner,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
