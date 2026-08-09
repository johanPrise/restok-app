import { BlurView } from 'expo-blur';
import { useEffect, useRef, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface GlassSurfaceProps {
  children: ReactNode;
  /** Intensité du flou, 0–100. */
  intensity?: number;
  /**
   * Doit être un objet **plat**. Les appelants qui passent par un Slot
   * (`asChild`) voient leurs styles fusionnés à l'étalement : un tableau y
   * deviendrait un objet à clés numériques, que react-native-web refuse.
   */
  style?: ViewStyle;
}

/**
 * Surface dépolie — un vrai flou de ce qui passe derrière.
 *
 * Trois implémentations pour un seul effet, parce qu'aucune ne couvre tout :
 * `backdrop-filter` n'existe pas en React Native, `BlurView` n'a pas
 * d'équivalent CSS gratuit, et react-native-web **filtre** les propriétés de
 * style qu'il ne connaît pas — d'où l'application directe sur le nœud DOM.
 *
 * La teinte est posée par-dessus le flou : `BlurView` seul prend la couleur de
 * ce qu'il floute, ce qui rend le contraste du contenu imprévisible.
 */
export function GlassSurface({
  children,
  intensity = 40,
  style,
}: Readonly<GlassSurfaceProps>) {
  const { isDark } = useTheme();
  const tint = isDark ? 'rgba(30, 38, 32, 0.72)' : 'rgba(251, 252, 250, 0.72)';

  if (Platform.OS === 'web') {
    return (
      <WebGlass
        blur={intensity / 2}
        style={{ ...style, backgroundColor: tint }}
      >
        {children}
      </WebGlass>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint={isDark ? 'dark' : 'light'}
      // Pas d'`experimentalBlurMethod` sur Android.
      //
      // Contrairement à iOS, où le flou est une primitive du système, Android
      // n'en a pas : la méthode « dimezisBlurView » capture la **vue racine** de
      // l'écran, la floute et la repeint. expo-blur remonte la hiérarchie pour
      // trouver cette racine et rabat sur celle de l'app s'il n'en trouve pas —
      // et toute l'app se retrouve alors repeinte sous un voile gris.
      //
      // On préfère donc une teinte franche sans flou sur Android. La barre reste
      // translucide, le contenu se devine dessous, et rien ne déborde.
      style={[style, styles.clip]}
    >
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: tint }]}
        pointerEvents="none"
      />
      {children}
    </BlurView>
  );
}

/**
 * `backdrop-filter` posé à la main : react-native-web ne transmet pas les
 * propriétés hors de sa liste connue, donc le passer par `style` ne produit
 * rien du tout.
 */
function WebGlass({
  blur,
  style,
  children,
}: Readonly<{ blur: number; style: ViewStyle; children: ReactNode }>) {
  const ref = useRef<View>(null);

  useEffect(() => {
    const node = ref.current as unknown as HTMLElement | null;
    if (!node?.style) return;

    const filter = `blur(${blur}px) saturate(180%)`;
    node.style.backdropFilter = filter;
    node.style.setProperty('-webkit-backdrop-filter', filter);
  }, [blur]);

  return (
    <View ref={ref} style={[style, styles.clip]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // Le flou doit être découpé par les coins arrondis, sinon la teinte déborde.
  clip: { overflow: 'hidden' },
});
