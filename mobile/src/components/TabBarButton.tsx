import type { TabTriggerSlotProps } from 'expo-router/ui';
import { useEffect, type ComponentType } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
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
 *
 * Un appui l'enfonce légèrement. Sans ce retour, toucher un onglet ne produisait
 * rien tant que l'écran n'avait pas basculé — et sur un rendu lent, on doute
 * d'avoir touché.
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
    elevation: lit.value * 4,
  }));

  // La couleur du glyphe ne peut pas être animée — il est dessiné en SVG et
  // reçoit une chaîne. Elle bascule donc d'un coup, sous le fondu de la
  // pastille, ce qui ne se voit pas.
  //
  // `ink` et non `inkSoft` pour l'onglet au repos : sur du verre, le contraste
  // dépend de ce qui défile derrière. Mesuré, `inkSoft` tombe à 3.08 en clair et
  // 2.27 en sombre dès qu'un nom d'item passe sous la barre — sous le seuil AA
  // de 4.5. `ink` tient 8.49 et 5.65 dans le même pire cas.
  //
  // La hiérarchie ne se perd pas : c'est la pastille remplie qui dit l'état
  // actif, pas la force du texte. Material fonctionne pareil.
  const tint = isFocused ? 'onPantryTeal' : 'ink';

  const glowStyle = useAnimatedStyle(() => ({ opacity: lit.value }));

  // Retour d'appui immédiat, sur le thread d'animation : il ne dépend donc pas
  // du temps que met l'écran à basculer.
  const press = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }));
  const squeeze = (to: number) => {
    press.value = reduced ? 1 : withSpring(to, PRESS_SPRING);
  };

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
      onPressIn={() => squeeze(0.92)}
      onPressOut={() => squeeze(1)}
      style={styles.trigger}
    >
      <Animated.View
        style={[
          styles.pill,
          { shadowColor: colors.pantryTeal },
          pillStyle,
          pressStyle,
        ]}
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
        <Text
          variant="tabLabel"
          color={tint}
          numberOfLines={1}
          // La barre est une chrome de hauteur fixe : au-delà de ce facteur,
          // « Inventaire » se fait tronquer. On plafonne plutôt que de laisser
          // un réglage d'accessibilité casser la mise en page.
          maxFontSizeMultiplier={1.1}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/** Court et peu amorti : l'enfoncement doit se sentir, pas se regarder. */
const PRESS_SPRING = { damping: 15, stiffness: 400 };

const styles = StyleSheet.create({
  // `flex: 1` plutôt que les largeurs du Figma : quatre cibles tactiles égales,
  // dont trois seraient sinon sous les 44px du §8.
  trigger: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pill: {
    minHeight: MIN_TOUCH_TARGET,
    // Elle épouse son contenu au lieu de remplir la cellule. En `width: '100%'`
    // les quatre pastilles partageaient leurs bords — zéro pixel entre elles,
    // mesuré — et la barre se lisait comme un bloc compact. Material fait le
    // même choix : son indicateur actif entoure son contenu, pas la cellule.
    //
    // Bornée à sa cellule : sur un très petit écran, « Paramètres » déborderait
    // sinon sur la pastille voisine. Un libellé tronqué reste moins mauvais que
    // deux pastilles qui se chevauchent.
    maxWidth: '100%',
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
