import { Pressable, StyleSheet, View } from 'react-native';
import { fillPercent, fillRatio } from '@/lib/stock';
import { lastActionLabel, statusBadge, statusColor } from '@/lib/item-display';
import { border, gauge, radius, spacing, useTheme } from '@/theme';
import type { Item } from '@/types/api';
import { Text } from './Text';

interface StockTagProps {
  item: Item;
  onPress?: () => void;
}

/**
 * L'étiquette d'inventaire — élément signature du design (§4).
 *
 * Trois détails portent la métaphore :
 * - la **perforation** est un vrai trou : elle laisse voir `paper` à travers
 *   `paperRaised`, là où un cercle gris dessiné trahirait le procédé ;
 * - le **coin inférieur droit** a un rayon plus grand que les autres, comme
 *   une étiquette cornée ;
 * - un item en stock bas porte un **liseré** de sa couleur de statut sur le
 *   bord gauche, visible sans lire.
 */
export function StockTag({ item, onPress }: Readonly<StockTagProps>) {
  const { colors } = useTheme();

  const accent = colors[statusColor(item.status)];
  const badge = statusBadge(item);
  const ratio = fillRatio(item);
  const isEmpty = ratio === 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}${badge ? `, ${badge}` : ''}`}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.paperRaised,
          borderColor: colors.thread,
          borderLeftColor: item.status === 'available' ? colors.thread : accent,
          borderLeftWidth:
            item.status === 'available' ? border.hairline : border.statusAccent,
          // §4 : un item épuisé s'efface légèrement, comme décroché de son fil.
          opacity: isEmpty ? 0.92 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.perforation,
          { backgroundColor: colors.paper, borderColor: colors.thread },
        ]}
      />

      <View style={styles.head}>
        <Text variant="tagName" style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        {badge !== null && (
          <View style={[styles.badge, { backgroundColor: accent }]}>
            <Text variant="monoLabel" color="paperRaised">
              {badge}
            </Text>
          </View>
        )}
      </View>

      {item.lastAction !== null && (
        <Text variant="body" color="inkSoft" style={styles.meta}>
          {lastActionLabel(item.lastAction)}
        </Text>
      )}

      <View style={[styles.rule, { backgroundColor: colors.thread }]} />

      <View style={styles.gaugeRow}>
        <Text
          variant="mono"
          style={[styles.percent, { color: accent }]}
          // Les chiffres restent alignés d'une ligne à l'autre.
          allowFontScaling={false}
        >
          {fillPercent(item)}%
        </Text>
        <View style={[styles.track, { backgroundColor: colors.thread }]}>
          <View
            style={[
              styles.fill,
              { backgroundColor: accent, width: `${ratio * 100}%` },
            ]}
          />
        </View>
      </View>
    </Pressable>
  );
}

const PERFORATION = 14;
const PERCENT_WIDTH = 44;

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    paddingTop: spacing.lg,
    borderWidth: border.hairline,
    borderRadius: radius.tag,
    borderBottomRightRadius: radius.tagFoldedCorner,
    gap: spacing.xs,
  },
  perforation: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: PERFORATION,
    height: PERFORATION,
    borderRadius: radius.full,
    borderWidth: border.hairline,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  name: { flex: 1 },
  badge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.button,
  },
  meta: { marginTop: -spacing.xs },
  rule: { height: border.hairline, marginVertical: spacing.xs },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  percent: { width: PERCENT_WIDTH },
  track: {
    flex: 1,
    height: gauge.height,
    borderRadius: gauge.radius,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: gauge.radius },
});
