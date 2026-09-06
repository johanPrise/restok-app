import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet } from 'react-native';
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
 * Accuser réception d'un geste délibéré.
 *
 * La règle n'est **pas** « seulement quand le résultat est invisible ». Voir un
 * écran changer ne dit pas que l'action a été enregistrée : la liste peut se
 * réordonner pour dix raisons. L'accusé de réception nomme ce qui vient d'être
 * fait — « Pain ajouté aux courses », « Tu as quitté le groupe » — et c'est ce
 * qui distingue une app qui répond d'une app qui laisse deviner.
 *
 * Une seule exception, et pour une raison précise : les gestes qui partent en
 * rafale. Cocher huit lignes au magasin ferait huit messages, chacun chassant
 * le précédent — la coche est déjà sa propre réponse, immédiate et réversible.
 * Partout ailleurs, un geste délibéré mérite un mot.
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
    insets.bottom +
    spacing.base +
    (TABS.includes(pathname) ? tabBar.height : 0);

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
                backgroundColor: colors.raised,
                borderColor: colors.rule,
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
    left: spacing.base,
    right: spacing.base,
    // Le toast est **frère** de la navigation, pas son enfant : sans rang
    // explicite, l'écran se peint par-dessus et le message existe sans se voir.
    zIndex: 100,
    elevation: 100,
  },
  toast: {
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    borderRadius: radius.base,
    borderWidth: border.hairline,
  },
});
