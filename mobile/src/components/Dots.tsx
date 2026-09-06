import { StyleSheet, View } from 'react-native';
import { radius, spacing, useTheme } from '@/theme';

/**
 * L'avancement d'un parcours d'accueil.
 *
 * Il était recopié à l'octet près dans `intro` et `notifications`, avec deux
 * rayons différents pour le même cercle — l'un en `radius.full`, l'autre en
 * `borderRadius: 3` écrit à la main.
 */
export function Dots({
  count,
  active,
  label,
}: Readonly<{ count: number; active: number; label: string }>) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={styles.row}
    >
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === active && styles.active,
            {
              backgroundColor: index === active ? colors.accent : colors.rule,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.tight,
    paddingVertical: spacing.base,
  },
  dot: {
    width: spacing.tight,
    height: spacing.tight,
    borderRadius: radius.full,
  },
  active: { width: spacing.card },
});
