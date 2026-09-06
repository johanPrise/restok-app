import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { border, radius, spacing, useTheme } from '@/theme';

interface TagCardProps {
  children: ReactNode;
  /** Liseré latéral de statut — low pour un stock bas, par exemple. */
  accentColor?: string;
  style?: ViewStyle;
}

/**
 * L'étiquette d'inventaire, élément signature du design (§4).
 *
 * Deux détails portent toute la métaphore : la perforation est un **vrai trou**
 * — elle laisse voir `paper` à travers `raised`, ce qu'un cercle gris
 * dessiné ne ferait pas — et le coin inférieur droit a un rayon plus grand,
 * comme une étiquette cornée.
 *
 * La profondeur vient de l'écart `paper` / `raised` plus le fil, jamais
 * d'une ombre portée.
 */
export function TagCard({
  children,
  accentColor,
  style,
}: Readonly<TagCardProps>) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.raised,
          borderColor: colors.rule,
          borderLeftColor: accentColor ?? colors.rule,
          borderLeftWidth: accentColor ? border.accent : border.hairline,
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
    width: PERFORATION_SIZE,
    height: PERFORATION_SIZE,
    borderRadius: radius.full,
  },
});
