import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { fillRatio } from '@/lib/stock';
import { emptiesOnTake, outcomeRatio, type SwipeAction } from '@/lib/tag-swipe';
import { useItemActions } from '@/lib/useItemActions';
import { motion, swipe, unhook } from '@/theme';
import type { Item } from '@/types/api';
import { StockTag } from './StockTag';

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
 * Dans les deux cas la jauge suit le doigt au lieu de sauter à la validation —
 * on voit ce qu'on est en train de faire avant de lâcher.
 *
 * Quand une prise vide l'item, la séquence de décrochage s'enchaîne : la jauge
 * se vide, le tag pivote comme décroché de son fil, puis remonte vers « À
 * racheter ». Sous `prefers-reduced-motion`, un simple fondu.
 *
 * Les deux actions sont aussi exposées comme actions d'accessibilité : le §4
 * interdit qu'une fonctionnalité ne soit atteignable qu'au geste. Leurs
 * équivalents visibles arrivent avec l'écran de détail.
 */
export function SwipeableStockTag({
  item,
  onPress,
  unhookOnEmpty = true,
}: Readonly<SwipeableStockTagProps>) {
  const reduced = useReducedMotion();
  const actions = useItemActions(item);

  const base = fillRatio(item);
  const takeRatio = outcomeRatio(item, 'take');
  const takeable = actions.canTake;

  const level = useSharedValue(base);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

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

  const commit = (action: SwipeAction) => {
    void feedback(action);

    if (action === 'restock') {
      translateX.value = withSpring(0, SNAP_BACK);
      level.value = withTiming(1, { duration: motion.standard });
      actions.restock({ onError: reset });
      return;
    }

    const unhooking = unhookOnEmpty && emptiesOnTake(item);
    if (unhooking) playUnhook();
    else translateX.value = withSpring(0, SNAP_BACK);

    actions.take({
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
      const dx = clamp(
        event.translationX,
        -swipe.maxTravel,
        takeable ? swipe.maxTravel : 0,
      );
      translateX.value = dx;

      const progress = Math.min(Math.abs(dx) / swipe.threshold, 1);
      const target = dx > 0 ? takeRatio : 1;
      level.value = base + (target - base) * progress;
    })
    .onEnd(() => {
      const dx = translateX.value;
      if (Math.abs(dx) >= swipe.threshold) {
        scheduleOnRN(commit, dx > 0 ? 'take' : 'restock');
        return;
      }

      translateX.value = withSpring(0, SNAP_BACK);
      level.value = withTiming(base, { duration: motion.standard });
    });

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        entering={FadeIn.duration(motion.standard)}
        style={cardStyle}
      >
        <StockTag
          item={item}
          onPress={handlePress}
          level={level}
          accessibilityHint="Balaye vers la droite pour signaler une prise, vers la gauche pour un rachat."
          accessibilityActions={[
            ...(takeable ? [{ name: 'take', label: "J'en ai pris" }] : []),
            { name: 'restock', label: "J'ai racheté" },
          ]}
          onAccessibilityAction={({ nativeEvent }) => {
            // Le nom vient du système : on ne le transtype pas, sinon une
            // action inconnue tomberait dans la branche « prise ».
            if (nativeEvent.actionName === 'take') commit('take');
            if (nativeEvent.actionName === 'restock') commit('restock');
          }}
        />
      </Animated.View>
    </GestureDetector>
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
