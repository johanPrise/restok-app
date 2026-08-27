import { Pressable, StyleSheet, View } from 'react-native';
import { feasibilityLabel, type Feasibility } from '@/lib/recipes';
import type { Palette } from '@/theme';
import { radius, spacing, textOn, useTheme } from '@/theme';
import type { Recipe } from '@/types/api';
import { TagCard } from './TagCard';
import { Text } from './Text';
import { useLocale } from '@/i18n/useT';

/**
 * La couleur de la pastille.
 *
 * Le §1 réserve les couleurs de statut au statut du stock — et c'est bien de ça
 * qu'il s'agit ici : « il manque » veut dire qu'un item est à racheter. La
 * pastille ne fait que résumer plusieurs statuts en un seul coup d'œil.
 *
 * `inkSoft` sur une recette muette, parce que ne rien savoir n'est pas un état
 * du stock.
 */
function pillColor(state: Feasibility): keyof Palette {
  if (state.kind === 'ready') return 'sage';
  if (state.kind === 'missing') return 'rustClay';

  return 'inkSoft';
}

interface RecipeCardProps {
  recipe: Recipe;
  state: Feasibility;
  onPress: () => void;
}

/**
 * Un plat sur l'étagère des recettes — le même tag qu'un item, parce que c'est
 * la même chose : une étiquette qu'on lit d'un coup d'œil.
 *
 * Les manquants sont **nommés sur la carte**. Sans ça, « il manque 2 choses »
 * obligerait à ouvrir chaque plat pour savoir lequel est à portée de main, et
 * le tri perdrait tout son intérêt.
 */
export function RecipeCard({
  recipe,
  state,
  onPress,
}: Readonly<RecipeCardProps>) {
  const { colors } = useTheme();
  const accent = pillColor(state);
  const locale = useLocale();
  const label = feasibilityLabel(state, locale);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${recipe.name}, ${label}`}
      onPress={onPress}
    >
      <TagCard
        accentColor={state.kind === 'missing' ? colors.rustClay : undefined}
      >
        <View style={styles.head}>
          <Text variant="tagName" style={styles.name} numberOfLines={2}>
            {recipe.name}
          </Text>
          <View style={[styles.pill, { backgroundColor: colors[accent] }]}>
            <Text variant="monoLabel" color={textOn(accent)}>
              {label}
            </Text>
          </View>
        </View>

        {state.kind === 'missing' && (
          <Text variant="caption" color="inkSoft" numberOfLines={2}>
            {state.items.join(' · ')}
          </Text>
        )}
      </TagCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  name: { flex: 1 },
  pill: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.button,
  },
});
