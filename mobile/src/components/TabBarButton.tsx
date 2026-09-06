import type { TabTriggerSlotProps } from 'expo-router/ui';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { motion, spacing, useTheme } from '@/theme';
import { Text } from './Text';

interface TabBarButtonProps extends TabTriggerSlotProps {
  /** Glyphe du Figma. Sa couleur suit l'état, elle n'est jamais codée en dur. */
  icon: ComponentType<{ color: string }>;
  label: string;
  /**
   * Cinq onglets au lieu de quatre. Mesuré à 390 points : chaque onglet passe
   * de 94 à 76 points, et « Inventaire » comme « Paramètres » réclament 68
   * points pour 64 disponibles. On rend donc les 4 points manquants en
   * resserrant le rembourrage interne — la cible tactile, elle, ne bouge pas :
   * c'est le `Pressable` qui la porte, pas ce conteneur.
   */
  compact?: boolean;
}

/**
 * Un onglet de la barre du bas. Rendu via `<TabTrigger asChild>` : expo-router
 * y injecte `onPress`, `isFocused` et sa propre `style` — que l'on remplace,
 * puisqu'elle range le contenu en ligne alors que la maquette l'empile.
 *
 * L'onglet actif ne se distingue que par la couleur : pas de pastille, pas de
 * fond, pas de halo. Le Figma exporté du produit ne montre aucune de ces trois
 * choses sur l'onglet actif — juste l'icône et le libellé en `accent` au
 * lieu d'`ink`. Une version antérieure de ce composant avait inventé une
 * pastille remplie ; elle ne correspond à rien dans la maquette.
 *
 * Un appui l'atténue brièvement. Sans ce retour, toucher un onglet ne produisait
 * rien tant que l'écran n'avait pas basculé — et sur un rendu lent, on doute
 * d'avoir touché. Rien dans le Figma (statique) ne dit le contraire.
 */
export function TabBarButton({
  icon: Icon,
  label,
  compact = false,
  isFocused = false,
  children: _ignored,
  style: _replaced,
  ...props
}: Readonly<TabBarButtonProps>) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  const tint = isFocused ? 'accent' : 'ink';

  // Retour d'appui immédiat, sur le rule d'animation : il ne dépend donc pas
  // du temps que met l'écran à basculer.
  //
  // Un fondu, pas une échelle : un ressort sur un `scale` reste sous-amorti à
  // moins de l'amortir jusqu'à la raideur critique, et un texte qui rebondit
  // avant de se stabiliser se voit — ça lisait comme un jouet, pas un bouton.
  // L'opacité n'a pas ce risque : `withTiming` ne dépasse jamais sa cible.
  const press = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    opacity: press.value,
  }));
  const squeeze = (to: number) => {
    press.value = reduced ? 1 : withTiming(to, { duration: motion.standard });
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
      onPressIn={() => squeeze(0.5)}
      onPressOut={() => squeeze(1)}
      style={styles.trigger}
    >
      <Animated.View
        style={[styles.content, compact && styles.contentCompact, pressStyle]}
      >
        <Icon color={colors[tint]} />
        <Text
          variant="tabLabel"
          color={tint}
          numberOfLines={1}
          // La barre est une chrome de hauteur fixe : au-delà de ce facteur,
          // « Inventaire » se fait tronquer. On plafonne plutôt que de laisser
          // un réglage d'accessibilité casser la mise en page.
          //
          // À cinq onglets il ne reste plus de marge du tout : le libellé ne
          // grandit plus. C'est un renoncement assumé, et le moindre — un
          // libellé tronqué ne se lit pas mieux qu'un libellé petit, et
          // l'icône, elle, continue de dire l'onglet.
          maxFontSizeMultiplier={compact ? 1 : 1.1}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // `flex: 1` plutôt que les largeurs du Figma : quatre cibles tactiles égales,
  // dont trois seraient sinon sous les 44px du §8.
  trigger: {
    flex: 1,
    // Remplit la hauteur utile de la barre sans déborder sur l'encoche système.
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    maxWidth: '100%',
    paddingHorizontal: spacing.hair,
    alignItems: 'center',
    justifyContent: 'center',
    // 4px entre icône et libellé, comme le « Margin » du Figma.
    gap: spacing.hair,
  },
  contentCompact: { paddingHorizontal: spacing.hair },
});
