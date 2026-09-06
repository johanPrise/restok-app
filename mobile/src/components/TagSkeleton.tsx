import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { border, gauge, motion, radius, spacing, useTheme } from '@/theme';

/**
 * Squelette de chargement en forme de tag, pas en rectangles gris génériques
 * (§7) : la page qui se charge annonce déjà ce qui va s'y trouver, et rien ne
 * bouge quand les vraies données arrivent.
 */
export function TagSkeleton() {
  const { colors } = useTheme();
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.85, { duration: motion.standard * 5 }),
      -1,
      true,
    );
  }, [pulse]);

  const shimmer = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.raised, borderColor: colors.rule },
      ]}
    >
      <View
        style={[
          styles.perforation,
          { backgroundColor: colors.paper, borderColor: colors.rule },
        ]}
      />
      <Animated.View style={shimmer}>
        <View style={[styles.name, { backgroundColor: colors.rule }]} />
        <View style={[styles.meta, { backgroundColor: colors.rule }]} />
        <View style={[styles.rule, { backgroundColor: colors.rule }]} />
        <View style={[styles.track, { backgroundColor: colors.rule }]} />
      </Animated.View>
    </View>
  );
}

const PERFORATION = 14;

const styles = StyleSheet.create({
  card: {
    padding: spacing.base,
    paddingTop: spacing.card,
    borderWidth: border.hairline,
    borderRadius: radius.base,
    borderBottomRightRadius: radius.base,
  },
  perforation: {
    position: 'absolute',
    top: spacing.tight,
    left: spacing.tight,
    width: PERFORATION,
    height: PERFORATION,
    borderRadius: radius.full,
    borderWidth: border.hairline,
  },
  name: {
    height: 18,
    width: '55%',
    borderRadius: radius.base,
    marginTop: spacing.tight,
  },
  meta: {
    height: 12,
    width: '35%',
    borderRadius: radius.base,
    marginTop: spacing.tight,
  },
  rule: { height: border.hairline, marginVertical: spacing.tight },
  track: { height: gauge.height, borderRadius: radius.full },
});
