import { Pressable, StyleSheet, View } from 'react-native';
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

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.block,
        { backgroundColor: colors.paperRaised, borderColor: colors.pantryTeal },
      ]}
    >
      <View style={styles.row}>
        <Text variant="monoLabel" color="pantryTeal">
          Le geste
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Masquer l’explication du balayage"
          hitSlop={spacing.xs}
          onPress={onDismiss}
        >
          <Text variant="monoLabel" color="inkSoft">
            Compris
          </Text>
        </Pressable>
      </View>

      {/* Les deux sens sont nommés dans l'ordre où ils arrivent : on vide bien
          plus souvent qu'on ne remplit. */}
      <Text variant="body">
        Tire un tag vers la <Text variant="bodyStrong">gauche</Text> quand tu
        prends quelque chose, vers la <Text variant="bodyStrong">droite</Text>{' '}
        quand tu en rachètes. Plus tu tires loin, plus la quantité monte.
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
