import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { border, MIN_TOUCH_TARGET, radius, spacing, useTheme } from '@/theme';
import type { Recipe } from '@/types/api';
import { RecipeIcon } from './icons';
import { Text } from './Text';

interface FeasibleTonightProps {
  recipes: Recipe[];
  onPress: (recipe: Recipe) => void;
}

/**
 * Ce qui se cuisine ce soir, annoncé sur l'étagère.
 *
 * Le risque numéro un des recettes est que personne n'aille voir un quatrième
 * onglet. Le rappel se place donc sur l'écran qu'on ouvre déjà — et **dans** la
 * liste défilante, pas au-dessus : il doit être vu en arrivant, puis s'effacer
 * quand on travaille sur son stock. L'étagère reste l'affaire de l'étagère.
 */
export function FeasibleTonight({
  recipes,
  onPress,
}: Readonly<FeasibleTonightProps>) {
  const { colors } = useTheme();

  if (recipes.length === 0) return null;

  return (
    <View style={styles.block}>
      <Text variant="monoLabel" color="inkSoft">
        Faisable ce soir
      </Text>

      {/* Horizontal : trois noms de plats ne tiennent pas côte à côte sur
          390px, et les tronquer les rendrait méconnaissables. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {recipes.map((recipe) => (
          <Pressable
            key={recipe.id}
            accessibilityRole="button"
            accessibilityLabel={`Ouvrir la recette ${recipe.name}`}
            onPress={() => onPress(recipe)}
            style={[
              styles.chip,
              {
                backgroundColor: colors.paperRaised,
                borderColor: colors.thread,
              },
            ]}
          >
            <RecipeIcon color={colors.inkSoft} size={14} />
            <Text variant="body" numberOfLines={1}>
              {recipe.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.xs },
  row: { gap: spacing.xs, paddingRight: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm,
    borderWidth: border.hairline,
    borderRadius: radius.button,
  },
});
