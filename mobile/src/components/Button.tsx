import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { MIN_TOUCH_TARGET, radius, spacing, useTheme } from '@/theme';
import type { Palette } from '@/theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  /** Marges et largeur seulement — l'apparence appartient au variant. */
  style?: ViewStyle;
}

/**
 * Les trois boutons du système.
 *
 * Aucun n'a de bordure : le fond suffit à les distinguer, et l'ordre de
 * `DESIGN.md` est espacement, puis fond teinté, puis trait. Le secondaire, qui
 * portait un liseré, prend un aplat `sunken` — son libellé y lit 4,56:1 en
 * clair et 4,77:1 en sombre.
 *
 * **L'inactif ne porte pas de fond du tout.** Il l'avait, en `sunken` avec un
 * libellé `inkSoft` : 4,14:1 en clair, sous le seuil, et c'était le premier
 * élément que l'app montrait — le bouton « Se connecter » est désactivé tant
 * que les champs sont vides. Un contrôle inerte ne réclame pas de surface ; en
 * `inkSoft` sur la page il lit 5,11:1 et 5,98:1, et il ne ressemble plus au
 * secondaire.
 */
export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  ...props
}: Readonly<ButtonProps>) {
  const { colors } = useTheme();
  const isDisabled = disabled === true || loading;

  const background = (pressed: boolean): string => {
    if (isDisabled) return 'transparent';
    if (variant === 'secondary') return colors.sunken;
    if (variant === 'danger') return colors.out;

    // L'état pressé augmente le contraste avec la page : il fonce en clair,
    // il s'éclaircit en sombre. Une règle, pas deux couleurs séparées.
    return pressed ? colors.accentPress : colors.accent;
  };

  const labelColor = (): keyof Palette => {
    if (isDisabled) return 'inkSoft';

    return variant === 'secondary' ? 'accent' : 'onAccent';
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      {...props}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background(pressed) },
        style,
      ]}
    >
      {/* Le libellé reste en place pendant le chargement : sans ça le bouton
          change de largeur et la mise en page saute. */}
      <Text
        variant="bodyStrong"
        color={labelColor()}
        // Le texte doit pouvoir grandir : le bloquer est un échec WCAG 1.4.4.
        // Plafonné, parce qu'au-delà le libellé passe à la ligne dans un
        // bouton dont la hauteur est contrainte.
        maxFontSizeMultiplier={1.5}
        style={loading && styles.hidden}
      >
        {label}
      </Text>
      {loading && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ActivityIndicator
            style={styles.spinner}
            color={colors[labelColor()]}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.tight,
    borderRadius: radius.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hidden: { opacity: 0 },
  spinner: { flex: 1 },
});
