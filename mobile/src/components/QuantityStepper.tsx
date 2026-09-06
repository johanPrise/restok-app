import { Pressable, StyleSheet, View } from 'react-native';
import { border, MIN_TOUCH_TARGET, radius, spacing, useTheme } from '@/theme';
import { Text } from './Text';
import { useT } from '@/i18n/useT';

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
  const t = useT();

  return (
    <View
      accessibilityLabel={`${label} : ${value}`}
      style={[styles.row, { borderColor: colors.rule }]}
    >
      <Step
        symbol="−"
        accessibilityLabel={t('commun.unDeMoins')}
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
      />
      <Text
        variant="title"
        style={styles.value}
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Step
        symbol="+"
        accessibilityLabel={t('commun.unDePlus')}
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
        variant="title"
        color={disabled ? 'rule' : 'accent'}
        maxFontSizeMultiplier={1.3}
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
    borderRadius: radius.base,
  },
  step: {
    width: STEP,
    height: STEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { minWidth: spacing.card, textAlign: 'center' },
});
