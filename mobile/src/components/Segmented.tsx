import { Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH_TARGET, radius, spacing, useTheme } from '@/theme';
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
      <Text variant="dataLabel" color="inkSoft">
        {label}
      </Text>

      <View
        accessibilityRole="radiogroup"
        style={[
          styles.track,
          { backgroundColor: colors.raised, borderColor: colors.rule },
        ]}
      >
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              // `aria-checked` et non `accessibilityState` : react-native-web
              // ne traduit plus le second, et un lecteur d'écran ne savait donc
              // pas quelle option était retenue. React Native le retraduit en
              // `accessibilityState.checked` sur mobile — la forme ARIA est
              // comprise des deux côtés. Même leçon que `TabBarButton`.
              aria-checked={selected}
              onPress={() => onChange(option.value)}
              style={[
                styles.segment,
                selected && { backgroundColor: colors.accent },
              ]}
            >
              {/* `ink` et non `inkSoft` sur le rail : `inkSoft` sur `sunken`
                  lit 4,14:1. La sélection se voit à l'aplat, pas à un texte
                  affaibli — sinon l'option non retenue devient illisible. */}
              <Text variant="bodyStrong" color={selected ? 'onAccent' : 'ink'}>
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
  group: { gap: spacing.tight },
  track: {
    flexDirection: 'row',
    borderRadius: radius.base,
    // Sans ça les coins des segments dépassent du cadre.
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.tight,
  },
});
