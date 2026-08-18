import { useEffect, useState } from 'react';
import { Pressable, PressableProps, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { fillPercent, fillRatio } from '@/lib/stock';
import { statusBadge, statusColor, tagMeta } from '@/lib/item-display';
import { border, gauge, motion, radius, spacing, useTheme } from '@/theme';
import type { Item } from '@/types/api';
import { BasketIcon } from './icons';
import { Text } from './Text';

interface StockTagProps extends Pick<
  PressableProps,
  'accessibilityActions' | 'onAccessibilityAction' | 'accessibilityHint'
> {
  item: Item;
  onPress?: () => void;
  /**
   * Déjà sur la liste de courses. Calculé côté client en croisant les deux
   * listes déjà en cache : l'étagère n'a pas à savoir que les courses
   * existent.
   */
  onList?: boolean;
  /**
   * Remplissage piloté de l'extérieur — la jauge suit le doigt pendant un
   * geste. Sans lui le tag anime son propre niveau sur les données.
   */
  level?: SharedValue<number>;
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
export function StockTag({
  item,
  onPress,
  onList = false,
  level,
  ...accessibility
}: Readonly<StockTagProps>) {
  const { colors } = useTheme();

  const accent = colors[statusColor(item.status)];
  const badge = statusBadge(item);
  const meta = tagMeta(item);
  const ratio = fillRatio(item);
  const isEmpty = ratio === 0;

  const own = useSharedValue(ratio);
  const shown = level ?? own;

  useEffect(() => {
    own.value = withTiming(ratio, { duration: motion.standard });
  }, [own, ratio]);

  const fillStyle = useAnimatedStyle(
    () => ({ width: `${shown.value * 100}%` }),
    [shown],
  );

  // Le chiffre suit la jauge, sinon un « 33 % » figé contredit une barre qui
  // se vide. On ne repasse en JS qu'au changement d'entier, pas à chaque frame.
  const [percent, setPercent] = useState(() => fillPercent(item));
  useAnimatedReaction(
    () => Math.round(shown.value * 100),
    (next, previous) => {
      if (next !== previous) scheduleOnRN(setPercent, next);
    },
    [shown],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}${badge ? `, ${badge}` : ''}${
        onList ? ', déjà sur la liste de courses' : ''
      }`}
      onPress={onPress}
      {...accessibility}
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
        {/* Un panier discret plutôt qu'un second badge : le statut garde son
            emplacement, et « déjà sur la liste » n'est pas un statut de stock —
            il ne prend donc aucune couleur du §1. */}
        {onList && <BasketIcon color={colors.inkSoft} size={14} />}
        {badge !== null && (
          <View style={[styles.badge, { backgroundColor: accent }]}>
            <Text variant="monoLabel" color="paperRaised">
              {badge}
            </Text>
          </View>
        )}
      </View>

      {meta !== null && (
        <Text
          variant="body"
          color="inkSoft"
          style={styles.meta}
          numberOfLines={1}
        >
          {meta}
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
          {percent}%
        </Text>
        <View style={[styles.track, { backgroundColor: colors.thread }]}>
          <Animated.View
            style={[styles.fill, { backgroundColor: accent }, fillStyle]}
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
