import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {
  border,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  useTheme,
} from '@/theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  /** Marges et largeur seulement — l'apparence appartient au variant. */
  style?: ViewStyle;
}

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

  const background = (pressed: boolean) => {
    // Un primaire estompé par l'opacité tombe à peu près sur `sage`, la
    // couleur du statut « disponible ». Le §1 réserve les couleurs de statut
    // au statut : l'inactif passe donc par un gris de la palette, jamais par
    // une teinte de marque atténuée.
    if (isDisabled) return variant === 'secondary' ? 'transparent' : colors.thread;
    if (variant === 'secondary') return 'transparent';
    if (variant === 'danger') return colors.rustClay;
    // L'état pressed a sa propre couleur dans la palette (§1).
    return pressed ? colors.pantryTealDeep : colors.pantryTeal;
  };

  const labelColor = (): keyof typeof colors => {
    if (isDisabled) return 'inkSoft';
    return variant === 'secondary' ? 'pantryTeal' : 'paperRaised';
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      {...props}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: background(pressed),
          borderColor: variant === 'secondary' ? colors.thread : 'transparent',
        },
        style,
      ]}
    >
      {/* Le libellé reste en place pendant le chargement : sans ça le bouton
          change de largeur et la mise en page saute. */}
      <Text
        variant="bodyStrong"
        color={labelColor()}
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    borderWidth: border.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hidden: { opacity: 0 },
  spinner: { flex: 1 },
});
