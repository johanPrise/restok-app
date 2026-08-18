import { Pressable, StyleSheet, View } from 'react-native';
import { border, MIN_TOUCH_TARGET, spacing, useTheme } from '@/theme';
import type { Palette } from '@/theme';
import { Text } from './Text';

interface SectionHeaderProps {
  title: string;
  count: number;
  color: keyof Palette;
  collapsed: boolean;
  onToggle: () => void;
}

/**
 * En-tête de section : titre, compteur en mono entre crochets, un trait qui
 * rappelle le fil du tag, et un chevron de repli.
 *
 * Le compteur est entre crochets et en mono parce que c'est une donnée, pas
 * une décoration — même traitement que les quantités et les dates (§2).
 */
export function SectionHeader({
  title,
  count,
  color,
  collapsed,
  onToggle,
}: Readonly<SectionHeaderProps>) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: !collapsed }}
      accessibilityLabel={`${title}, ${count} items`}
      onPress={onToggle}
      style={styles.row}
    >
      <Text variant="monoLabel" color={color}>
        {title} [{String(count).padStart(2, '0')}]
      </Text>
      <View style={[styles.line, { backgroundColor: colors.thread }]} />
      <Text variant="body" color="inkSoft" style={styles.chevron}>
        {collapsed ? '›' : '⌄'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
  },
  line: { flex: 1, height: border.hairline },
  chevron: { width: 16, textAlign: 'center' },
});
