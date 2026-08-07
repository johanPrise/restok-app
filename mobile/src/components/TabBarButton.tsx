import type { TabTriggerSlotProps } from 'expo-router/ui';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH_TARGET, radius, useTheme } from '@/theme';
import { Text } from './Text';

interface TabBarButtonProps extends TabTriggerSlotProps {
  /** Glyphe du Figma. Sa couleur suit l'état, elle n'est jamais codée en dur. */
  icon: ComponentType<{ color: string }>;
  label: string;
}

/**
 * Un onglet de la barre du bas. Rendu via `<TabTrigger asChild>` : expo-router
 * y injecte `onPress`, `isFocused` et sa propre `style` — que l'on remplace,
 * puisqu'elle range le contenu en ligne alors que la maquette l'empile.
 *
 * La pastille teal ne dépend pas du focus pour ses dimensions : ses marges
 * s'appliquent dans les deux états, sinon la barre se réorganiserait à chaque
 * changement d'onglet.
 */
export function TabBarButton({
  icon: Icon,
  label,
  isFocused = false,
  children: _ignored,
  style: _replaced,
  ...props
}: Readonly<TabBarButtonProps>) {
  const { colors } = useTheme();
  const tint = isFocused ? 'onPantryTeal' : 'inkSoft';

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      {...props}
      style={styles.trigger}
    >
      <View
        style={[
          styles.pill,
          isFocused && { backgroundColor: colors.pantryTeal },
        ]}
      >
        {/* Boîte de hauteur fixe : les quatre glyphes n'ont pas les mêmes
            proportions, seule une hauteur commune aligne les libellés. */}
        <View style={styles.glyph}>
          <Icon color={colors[tint]} />
        </View>
        <Text variant="tabLabel" color={tint} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const GLYPH_HEIGHT = 20;

const styles = StyleSheet.create({
  // `flex: 1` plutôt que les largeurs du Figma : quatre cibles tactiles égales,
  // dont trois seraient sinon sous les 44px du §8.
  trigger: { flex: 1, alignItems: 'center' },
  pill: {
    minHeight: MIN_TOUCH_TARGET,
    // 6 et non 16 comme le Figma : la pastille y est dessinée à sa largeur
    // naturelle, alors qu'ici elle doit tenir dans un quart de la barre.
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: radius.tag,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { height: GLYPH_HEIGHT, justifyContent: 'center' },
});
