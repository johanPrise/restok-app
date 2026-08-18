import { Pressable, StyleSheet, View } from 'react-native';
import { border, MIN_TOUCH_TARGET, radius, spacing, useTheme } from '@/theme';
import { Text } from './Text';

interface SegmentedProps<T extends string> {
  label: string;
  /** Ce que le choix change, en une ligne — le §5 refuse les infobulles. */
  hint?: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

/**
 * Choix entre deux ou trois options exclusives, posées côte à côte plutôt que
 * dans une liste déroulante : à ce nombre-là, cacher les options coûte un tap
 * et une hésitation pour rien.
 */
export function Segmented<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: Readonly<SegmentedProps<T>>) {
  const { colors } = useTheme();

  return (
    <View style={styles.group}>
      <Text variant="monoLabel" color="inkSoft">
        {label}
      </Text>

      <View
        accessibilityRole="radiogroup"
        style={[
          styles.track,
          { backgroundColor: colors.paperRaised, borderColor: colors.thread },
        ]}
      >
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              onPress={() => onChange(option.value)}
              style={[
                styles.segment,
                selected && { backgroundColor: colors.pantryTeal },
              ]}
            >
              <Text
                variant="bodyStrong"
                color={selected ? 'onPantryTeal' : 'inkSoft'}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {hint !== undefined && (
        <Text variant="caption" color="inkSoft">
          {hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  track: {
    flexDirection: 'row',
    borderWidth: border.hairline,
    borderRadius: radius.button,
    // Sans ça les coins des segments dépassent du cadre.
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
});
