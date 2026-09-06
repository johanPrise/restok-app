import { StyleSheet, View } from 'react-native';
import { gauge, radius, spacing, textStyles, useTheme } from '@/theme';

type LineVariant = 'title' | 'body' | 'caption';

/**
 * Une ligne de texte en attente.
 *
 * Sa hauteur vient de `textStyles`, pas d'un nombre écrit à la main : c'est la
 * seule façon que le squelette ait vraiment la taille de ce qu'il remplace.
 * L'ancien annonçait « rien ne bouge quand les vraies données arrivent » et se
 * trompait de 20pt par ligne — il posait ses écarts en `marginTop` de 8/12/12
 * là où le tag les posait en `gap` de 8, et la liste remontait de 61pt à
 * l'arrivée des données.
 *
 * **Aucune animation.** Les barres pulsaient entre 0,4 et 0,85 d'opacité, ce
 * qui les mettait à 1,12:1 — l'indicateur de chargement de l'app était
 * invisible. À `rule`, toute opacité sous 100 % retombe sous le seuil de 3:1
 * en mode clair. La règle de `DESIGN.md` est le plancher de contraste d'abord,
 * la quantité d'effet ensuite : l'effet est donc supprimé, pas atténué. Il
 * emportait avec lui la seule animation infinie de l'app, qui ignorait le
 * réglage « réduire les animations ».
 */
export function SkeletonLine({
  variant = 'body',
  width = '100%',
}: Readonly<{ variant?: LineVariant; width?: number | `${number}%` }>) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        height: textStyles[variant].lineHeight,
        width,
        borderRadius: radius.base,
        backgroundColor: colors.rule,
      }}
    />
  );
}

/** Une étiquette en attente : nom, méta, jauge. Même rythme que la vraie. */
export function ItemSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={styles.item}>
      <SkeletonLine variant="title" width="60%" />
      <SkeletonLine variant="caption" width="40%" />
      <View style={[styles.gauge, { backgroundColor: colors.rule }]} />
    </View>
  );
}

/** Une ligne de registre en attente. Le journal n'a rien d'une étiquette. */
export function RowSkeleton() {
  return (
    <View style={styles.row}>
      <SkeletonLine variant="caption" width="30%" />
      <SkeletonLine variant="caption" width="45%" />
    </View>
  );
}

const styles = StyleSheet.create({
  item: { gap: spacing.tight },
  row: { flexDirection: 'row', gap: spacing.tight },
  gauge: { height: gauge.height, borderRadius: radius.full },
});
