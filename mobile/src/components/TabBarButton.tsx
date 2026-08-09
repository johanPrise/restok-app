import type { TabTriggerSlotProps } from 'expo-router/ui';
import { useEffect, type ComponentType } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { motion, MIN_TOUCH_TARGET, radius, spacing, useTheme } from '@/theme';
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
 * L'onglet actif s'allume : sa pastille arrondie se remplit de teal et gagne un
 * halo. La transition est animée plutôt que sèche, parce qu'un changement
 * d'onglet est un déplacement — l'œil doit pouvoir suivre d'où vient la lumière.
 *
 * Les marges de la pastille s'appliquent dans les deux états : sinon la barre
 * se réorganiserait à chaque changement d'onglet.
 */
export function TabBarButton({
  icon: Icon,
  label,
  isFocused = false,
  children: _ignored,
  style: _replaced,
  ...props
}: Readonly<TabBarButtonProps>) {
  const { colors, isDark } = useTheme();
  const reduced = useReducedMotion();

  const lit = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    lit.value = reduced
      ? Number(isFocused)
      : withTiming(Number(isFocused), { duration: motion.standard });
  }, [isFocused, lit, reduced]);

  // Le rectangle existe toujours — c'est lui qui donne la forme — mais son
  // contour ne s'affirme qu'allumé. Sans ça les quatre onglets se ressemblent
  // trop et l'actif ne se détache plus.
  const dim = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(28,38,32,0.07)';
  const bright = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.55)';

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      lit.value,
      [0, 1],
      ['transparent', colors.pantryTeal],
    ),
    borderColor: interpolateColor(lit.value, [0, 1], [dim, bright]),
    // Le halo n'a de sens qu'allumé : à zéro il ne coûte rien.
    shadowOpacity: lit.value * 0.55,
    elevation: lit.value * 8,
  }));

  // La couleur du glyphe ne peut pas être animée — il est dessiné en SVG et
  // reçoit une chaîne. Elle bascule donc d'un coup, sous le fondu de la
  // pastille, ce qui ne se voit pas.
  const tint = isFocused ? 'onPantryTeal' : 'inkSoft';

  const glowStyle = useAnimatedStyle(() => ({ opacity: lit.value }));

  return (
    <Pressable
      {...props}
      // Après l'étalement, et non avant : `TabTrigger` pousse ses propres props
      // d'accessibilité, qui écrasaient l'état sélectionné.
      //
      // `aria-selected` et non `accessibilityState` : react-native-web ne
      // traduit plus le second, et un lecteur d'écran ne savait donc pas sur
      // quel onglet il se trouvait. La forme ARIA est comprise des deux côtés.
      role="tab"
      aria-selected={isFocused}
      style={styles.trigger}
    >
      <Animated.View
        style={[styles.pill, { shadowColor: colors.pantryTeal }, pillStyle]}
      >
        {/* Le trait de lumière en haut de la pastille : c'est lui qui donne
            l'impression que l'onglet est éclairé et non simplement coloré. */}
        <Animated.View
          style={[
            styles.glow,
            { backgroundColor: colors.onPantryTeal },
            glowStyle,
          ]}
        />
        <Icon color={colors[tint]} />
        <Text variant="tabLabel" color={tint} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // `flex: 1` plutôt que les largeurs du Figma : quatre cibles tactiles égales,
  // dont trois seraient sinon sous les 44px du §8.
  trigger: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pill: {
    minHeight: MIN_TOUCH_TARGET,
    width: '100%',
    // 6 et non 16 comme le Figma : la pastille y est dessinée à sa largeur
    // naturelle, alors qu'ici elle doit tenir dans un quart de la barre.
    paddingHorizontal: 6,
    paddingVertical: spacing.xs / 2,
    borderRadius: radius.tag + 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
  },
  glow: {
    position: 'absolute',
    top: 4,
    width: 16,
    height: 2,
    borderRadius: 1,
  },
});
