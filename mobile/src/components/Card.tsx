import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { border, radius, spacing, useTheme } from '@/theme';

interface CardProps {
  children: ReactNode;
  /** Marqueur de statut sur le bord gauche — un canal d'épaisseur, pas de teinte. */
  accentColor?: string;
  style?: ViewStyle;
}

/**
 * Une surface qui se détache de la page.
 *
 * Elle ne sert plus qu'à ce qui **flotte vraiment** : le code d'invitation, un
 * état vide, le contenu d'un écran de formulaire. Les étiquettes d'une liste
 * n'en sont plus : elles se séparent par le blanc, ce qui fait tomber leur
 * hauteur de 143 à 66pt.
 *
 * Elle garde un trait, et c'est le seul endroit avec le champ de saisie où le
 * trait se justifie : `raised` ne se détache de `paper` qu'à 1,08:1 — un
 * aplat qu'on ne distingue pas n'est pas une surface. Le trait, lui, lit
 * 3,21:1 en clair et 3,90:1 en sombre.
 *
 * Ce qui a disparu : la perforation, dont le cercle plafonnait à 1,33:1 et
 * qu'on ne voyait donc pas, et le coin corné, qui était le huitième rayon d'un
 * système qui n'en veut qu'un.
 */
export function Card({ children, accentColor, style }: Readonly<CardProps>) {
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
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.card,
    borderWidth: border.hairline,
    borderRadius: radius.base,
  },
});
