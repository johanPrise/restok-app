import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useT } from '@/i18n/useT';
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
  const t = useT();

  if (recipes.length === 0) return null;

  return (
    <View style={styles.block}>
      <Text variant="dataLabel" color="inkSoft">
        {t('recettes.faisableCeSoir')}
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
            accessibilityLabel={t('recettes.ouvrirLaRecette', {
              nom: recipe.name,
            })}
            onPress={() => onPress(recipe)}
            style={[
              styles.chip,
              {
                backgroundColor: colors.raised,
                borderColor: colors.rule,
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
  block: { gap: spacing.tight },
  row: { gap: spacing.tight, paddingRight: spacing.base },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.tight,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.base,
    borderWidth: border.hairline,
    borderRadius: radius.base,
  },
});
