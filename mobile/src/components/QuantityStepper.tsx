import { Pressable, StyleSheet, View } from 'react-native';
import { border, MIN_TOUCH_TARGET, radius, spacing, useTheme } from '@/theme';
import { Text } from './Text';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  /** Ce que le nombre compte — décrit l'ensemble pour un lecteur d'écran. */
  label: string;
}

/**
 * Choix d'une quantité au pouce, sans clavier.
 *
 * Deux boutons et un nombre : c'est plus rapide que d'ouvrir un pavé numérique
 * pour saisir « 3 », et ça borne la valeur à ce qui a du sens — on ne prend pas
 * plus d'unités qu'il n'en reste.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  label,
}: Readonly<QuantityStepperProps>) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityLabel={`${label} : ${value}`}
      style={[styles.row, { borderColor: colors.thread }]}
    >
      <Step
        symbol="−"
        accessibilityLabel="Un de moins"
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
      />
      <Text
        variant="tagName"
        style={styles.value}
        allowFontScaling={false}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Step
        symbol="+"
        accessibilityLabel="Un de plus"
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
      />
    </View>
  );
}

function Step({
  symbol,
  accessibilityLabel,
  disabled,
  onPress,
}: Readonly<{
  symbol: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.step}
    >
      <Text
        variant="tagName"
        color={disabled ? 'thread' : 'pantryTeal'}
        allowFontScaling={false}
      >
        {symbol}
      </Text>
    </Pressable>
  );
}

const STEP = MIN_TOUCH_TARGET;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: border.hairline,
    borderRadius: radius.button,
  },
  step: {
    width: STEP,
    height: STEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { minWidth: spacing.lg, textAlign: 'center' },
});
