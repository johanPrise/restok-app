import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  Easing,
  FadeIn,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { fillRatio } from '@/lib/stock';
import {
  defaultRestockUnits,
  emptiesOnTake,
  maxUnits,
  ratioAfter,
  type SwipeAction,
} from '@/lib/tag-swipe';
import { unitsInPacks } from '@/lib/units';
import { useItemActions } from '@/lib/useItemActions';
import {
  motion,
  radius,
  spacing,
  swipeTravel,
  swipeUnits,
  unhook,
  useTheme,
} from '@/theme';
import type { Item } from '@/types/api';
import { StockTag } from './StockTag';
import { Text } from './Text';

interface SwipeableStockTagProps {
  item: Item;
  onPress?: () => void;
  /**
   * Le décrochage raconte le départ du tag vers « À racheter ». Sur l'écran de
   * détail il n'a nulle part où aller : le laisser jouer ferait disparaître le
   * seul élément de la page.
   */
  unhookOnEmpty?: boolean;
}

const SNAP_BACK = { damping: 18, stiffness: 220 };
/** Peu amorti : c'est lui qui donne le « léger rebond » du §4. */
const UNHOOK_LIFT = { damping: 9, stiffness: 200 };

/**
 * Le tag et ses deux gestes (§4).
 *
 * Gauche → droite : « j'en ai pris ». C'est le geste le plus fréquent, donc
 * celui qui va dans le sens de lecture. Droite → gauche : « j'ai racheté ».
 *
 * La course dit **combien** : passé le seuil, chaque cran ajoute une unité, et
 * la jauge suit en direct. Sans ça une prise valait toujours une unité — on ne
 * pouvait pas dire qu'on avait pris trois œufs autrement qu'en balayant trois
 * fois. Le compte s'affiche pendant le geste, à l'endroit que le tag découvre.
 *
 * Les deux actions sont aussi exposées comme actions d'accessibilité : le §4
 * interdit qu'une fonctionnalité ne soit atteignable qu'au geste.
 */
export function SwipeableStockTag({
  item,
  onPress,
  unhookOnEmpty = true,
}: Readonly<SwipeableStockTagProps>) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const actions = useItemActions(item);

  const base = fillRatio(item);
  const takeable = actions.canTake;
  const takeMax = maxUnits(item, 'take');
  const restockMax = maxUnits(item, 'restock');

  /**
   * Tout ce dont le geste a besoin, en tableaux de nombres bruts.
   *
   * Un worklet tourne sur le thread d'animation et ne peut pas appeler une
   * fonction JS ordinaire : le faire marche sur le web, où tout partage le même
   * thread, et lève en natif. On calcule donc les paliers **avant**, et le
   * geste ne fait plus qu'indexer.
   *
   * Un cran de rachat vaut un paquet quand l'item s'achète par lot — c'est
   * l'unité dans laquelle on revient du magasin.
   */
  const { takeRatios, restockRatios, restockUnitsByNotch } = useMemo(() => {
    const notch = (count: number) => count + 1;

    return {
      takeRatios: Array.from({ length: notch(takeMax) }, (_, units) =>
        units === 0 ? base : ratioAfter(item, 'take', units),
      ),
      restockRatios: Array.from({ length: notch(restockMax) }, (_, packs) =>
        packs === 0
          ? base
          : ratioAfter(item, 'restock', unitsInPacks(item, packs)),
      ),
      restockUnitsByNotch: Array.from(
        { length: notch(restockMax) },
        (_, packs) => unitsInPacks(item, packs),
      ),
    };
  }, [base, item, restockMax, takeMax]);

  // Mêmes raisons : les bornes de course sont des nombres, pas des appels.
  const maxRight = takeable ? swipeTravel(takeMax) : 0;
  const maxLeft = -swipeTravel(restockMax);

  const level = useSharedValue(base);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  /** Signé : positif pour une prise, négatif pour un rachat, 0 hors geste. */
  const pending = useSharedValue(0);

  const [units, setUnits] = useState(0);

  useAnimatedReaction(
    () => pending.value,
    (next, previous) => {
      if (next !== previous) scheduleOnRN(setUnits, next);
    },
    [pending],
  );

  // Hors geste, la jauge suit les données — y compris quand quelqu'un d'autre
  // agit sur l'item et que le refetch rapporte une nouvelle quantité.
  useEffect(() => {
    level.value = withTiming(base, { duration: motion.standard });
  }, [base, level]);

  const reset = () => {
    level.value = withTiming(base, { duration: motion.standard });
    translateX.value = withSpring(0, SNAP_BACK);
    translateY.value = 0;
    rotate.value = 0;
    opacity.value = 1;
    pending.value = 0;
  };

  const playUnhook = () => {
    if (reduced) {
      level.value = 0;
      opacity.value = withTiming(0, { duration: motion.standard });
      return;
    }

    level.value = withTiming(0, {
      duration: motion.gaugeDrain,
      easing: Easing.out(Easing.quad),
    });
    rotate.value = withDelay(
      unhook.rotateAt,
      withTiming(unhook.angle, { duration: motion.tagUnhook }),
    );
    translateY.value = withDelay(
      unhook.slideAt,
      withSpring(unhook.lift, UNHOOK_LIFT),
    );
    opacity.value = withDelay(
      unhook.slideAt,
      withTiming(0, { duration: motion.tagSlide }),
    );
  };

  const commit = (action: SwipeAction, count: number) => {
    void feedback(action);
    pending.value = 0;

    if (action === 'restock') {
      translateX.value = withSpring(0, SNAP_BACK);
      level.value = withTiming(ratioAfter(item, 'restock', count), {
        duration: motion.standard,
      });
      actions.restock({ units: count, onError: reset });
      return;
    }

    const unhooking = unhookOnEmpty && emptiesOnTake(item, count);
    if (unhooking) playUnhook();
    else translateX.value = withSpring(0, SNAP_BACK);

    actions.take({
      units: count,
      onError: reset,
      settleDelayMs: unhooking && !reduced ? unhook.total : undefined,
    });
  };

  /**
   * Un balayage se termine aussi par un relâchement, que le `Pressable` du tag
   * lit comme un tap : sans ce drapeau, prendre un item ouvrait son détail dans
   * la foulée. `onBegin` se déclenche à chaque contact, `onStart` seulement
   * quand le pan s'active — un vrai tap ne passe donc jamais par le second.
   */
  const swiping = useRef(false);
  const setSwiping = (value: boolean) => {
    swiping.current = value;
  };

  const handlePress = () => {
    if (swiping.current) return;
    onPress?.();
  };

  const pan = Gesture.Pan()
    .enabled(!actions.busy)
    // Le défilement vertical de l'étagère garde la priorité : sans ces seuils,
    // un doigt qui descend emporterait le tag avec lui.
    .activeOffsetX([-16, 16])
    .failOffsetY([-14, 14])
    .onBegin(() => {
      scheduleOnRN(setSwiping, false);
    })
    .onStart(() => {
      scheduleOnRN(setSwiping, true);
    })
    .onUpdate((event) => {
      const dx = clamp(event.translationX, maxLeft, maxRight);
      translateX.value = dx;

      const taking = dx > 0;
      const notches = swipeUnits(dx, taking ? takeMax : restockMax);
      const count = taking ? notches : restockUnitsByNotch[notches];

      pending.value = taking ? count : -count;
      level.value = taking ? takeRatios[notches] : restockRatios[notches];
    })
    .onEnd(() => {
      const dx = translateX.value;
      const taking = dx > 0;
      const notches = swipeUnits(dx, taking ? takeMax : restockMax);
      const count = taking ? notches : restockUnitsByNotch[notches];

      if (count > 0) {
        scheduleOnRN(commit, taking ? 'take' : 'restock', count);
        return;
      }

      translateX.value = withSpring(0, SNAP_BACK);
      level.value = withTiming(base, { duration: motion.standard });
      pending.value = 0;
    });

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const counterStyle = useAnimatedStyle(() => ({
    opacity: pending.value === 0 ? 0 : 1,
  }));

  // L'action d'accessibilité double le geste : un cran, donc un paquet.
  const restockUnits = Math.min(
    defaultRestockUnits(item),
    restockUnitsByNotch[restockMax],
  );

  return (
    <GestureDetector gesture={pan}>
      <Animated.View entering={FadeIn.duration(motion.standard)}>
        {/* Le compte apparaît là où le tag découvre le fond : à gauche quand il
            part à droite, et l'inverse. */}
        <Animated.View
          style={[styles.counters, counterStyle]}
          pointerEvents="none"
        >
          {/* Rien du tout hors geste : un « −0 » invisible resterait lu par les
              lecteurs d'écran. */}
          {units > 0 && (
            <Counter label={`−${units}`} color={colors.rustClay} align="left" />
          )}
          {units < 0 && (
            <Counter
              label={`+${-units}`}
              color={colors.pantryTeal}
              align="right"
            />
          )}
        </Animated.View>

        <Animated.View style={cardStyle}>
          <StockTag
            item={item}
            onPress={handlePress}
            level={level}
            accessibilityHint="Balaye vers la droite pour signaler une prise, vers la gauche pour un rachat. Plus la course est longue, plus la quantité est grande."
            accessibilityActions={[
              ...(takeable ? [{ name: 'take', label: "J'en ai pris un" }] : []),
              {
                name: 'restock',
                label: `J'en ai racheté ${restockUnits}`,
              },
            ]}
            onAccessibilityAction={({ nativeEvent }) => {
              // Le nom vient du système : on ne le transtype pas, sinon une
              // action inconnue tomberait dans la branche « prise ».
              if (nativeEvent.actionName === 'take') commit('take', 1);
              if (nativeEvent.actionName === 'restock') {
                commit('restock', restockUnits);
              }
            }}
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function Counter({
  label,
  color,
  align,
}: Readonly<{ label: string; color: string; align: 'left' | 'right' }>) {
  return (
    <View style={align === 'left' ? styles.left : styles.right}>
      <Text variant="tagName" style={{ color }} allowFontScaling={false}>
        {label}
      </Text>
    </View>
  );
}

/**
 * §4 : haptique légère à la prise, confirmation plus marquée au rachat — on
 * rachète moins souvent, et l'événement compte davantage pour le groupe.
 * `expo-haptics` n'a pas d'implémentation web.
 */
async function feedback(action: SwipeAction): Promise<void> {
  if (Platform.OS === 'web') return;

  await (action === 'take'
    ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

const styles = StyleSheet.create({
  counters: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderRadius: radius.tag,
  },
  // `auto` pousse le compteur du côté opposé à celui d'où vient le tag.
  left: { marginRight: 'auto' },
  right: { marginLeft: 'auto' },
});
