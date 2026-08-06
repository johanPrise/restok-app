import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { border, radius, spacing, useTheme } from '@/theme';

interface TagCardProps {
  children: ReactNode;
  /** Liseré latéral de statut — mustard pour un stock bas, par exemple. */
  accentColor?: string;
  style?: ViewStyle;
}

/**
 * L'étiquette d'inventaire, élément signature du design (§4).
 *
 * Deux détails portent toute la métaphore : la perforation est un **vrai trou**
 * — elle laisse voir `paper` à travers `paperRaised`, ce qu'un cercle gris
 * dessiné ne ferait pas — et le coin inférieur droit a un rayon plus grand,
 * comme une étiquette cornée.
 *
 * La profondeur vient de l'écart `paper` / `paperRaised` plus le fil, jamais
 * d'une ombre portée.
 */
export function TagCard({ children, accentColor, style }: Readonly<TagCardProps>) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.paperRaised,
          borderColor: colors.thread,
          borderLeftColor: accentColor ?? colors.thread,
          borderLeftWidth: accentColor ? border.statusAccent : border.hairline,
        },
        style,
      ]}
    >
      <View style={[styles.perforation, { backgroundColor: colors.paper }]} />
      {children}
    </View>
  );
}

const PERFORATION_SIZE = 10;

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    paddingTop: spacing.lg,
    borderWidth: border.hairline,
    borderRadius: radius.tag,
    borderBottomRightRadius: radius.tagFoldedCorner,
  },
  perforation: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: PERFORATION_SIZE,
    height: PERFORATION_SIZE,
    borderRadius: radius.full,
  },
});
