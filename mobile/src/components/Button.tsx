import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  View,
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
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  ...props
}:   Readonly<ButtonProps>) {
  const { colors } = useTheme();
  const isDisabled = disabled === true || loading;

  const background = (pressed: boolean) => {
    if (variant === 'secondary') return 'transparent';
    if (variant === 'danger') return colors.rustClay;
    // L'état pressed a sa propre couleur dans la palette (§1).
    return pressed ? colors.pantryTealDeep : colors.pantryTeal;
  };

  const labelColor = variant === 'secondary' ? 'pantryTeal' : 'paperRaised';

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
          opacity: isDisabled ? 0.5 : 1,
        },
      ]}
    >
      {/* Le libellé reste en place pendant le chargement : sans ça le bouton
          change de largeur et la mise en page saute. */}
      <Text variant="bodyStrong" color={labelColor} style={loading && styles.hidden}>
        {label}
      </Text>
      {loading && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ActivityIndicator
            style={styles.spinner}
            color={variant === 'secondary' ? colors.pantryTeal : colors.paperRaised}
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
