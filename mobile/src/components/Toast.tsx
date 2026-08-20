import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeOutDown,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  border,
  chrome,
  motion,
  radius,
  spacing,
  tabBar,
  useTheme,
} from '@/theme';
import { Text } from './Text';

/** Le temps de lire une phrase courte, pas plus. */
const VISIBLE_MS = 3000;

/** Les quatre routes qui portent la barre d'onglets. */
const TABS = ['/shelf', '/shopping', '/recipes', '/settings'];

const ToastContext = createContext<(message: string) => void>(() => {});

/**
 * Confirmer une action **dont l'effet ne se voit pas ici**.
 *
 * C'est le seul cas où un toast se justifie. Cocher une ligne coche la case,
 * balayer un tag décroche le tag, créer une recette la fait apparaître dans la
 * liste : répéter ça par-dessus l'écran, c'est du bruit qui apprend à ignorer
 * les messages — y compris ceux qui comptent.
 *
 * Restent les actions qui écrivent **ailleurs** : verser des manquants dans les
 * courses depuis une recette, signaler un item épuisé depuis une fiche, clore
 * les courses et remettre du stock. Là, sans un mot, on ne sait pas si le geste
 * a porté.
 */
export function useToast(): (message: string) => void {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    // Le message doit atteindre aussi ceux qui n'ont pas l'écran sous les yeux.
    AccessibilityInfo.announceForAccessibility(next);
    timer.current = setTimeout(() => setMessage(null), VISIBLE_MS);
  }, []);

  const value = useMemo(() => show, [show]);

  // Au-dessus de la barre d'onglets là où elle existe : elle est ancrée dans le
  // flux, la recouvrir masquerait la navigation le temps de la lecture.
  const bottom =
    insets.bottom + spacing.md + (TABS.includes(pathname) ? tabBar.height : 0);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {message !== null && (
        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(motion.standard)}
          exiting={reduced ? undefined : FadeOutDown.duration(motion.standard)}
          pointerEvents="box-none"
          style={[styles.slot, { bottom }]}
        >
          {/* Il flotte au-dessus du contenu : il relève donc de la « chrome
              flottante » du §3 — fil, rayon, et l'ombre de niveau 3 — et non du
              traitement plat des tags, qui eux reposent sur l'étagère. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${message}. Toucher pour fermer.`}
            onPress={() => setMessage(null)}
            style={[
              styles.toast,
              chrome,
              {
                backgroundColor: colors.paperRaised,
                borderColor: colors.thread,
              },
            ]}
          >
            <Text variant="body" numberOfLines={2}>
              {message}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    // Le toast est **frère** de la navigation, pas son enfant : sans rang
    // explicite, l'écran se peint par-dessus et le message existe sans se voir.
    zIndex: 100,
    elevation: 100,
  },
  toast: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.chrome,
    borderWidth: border.rim,
  },
});
