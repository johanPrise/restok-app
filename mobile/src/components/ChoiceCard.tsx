import { ReactNode, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { border, spacing, useTheme } from '@/theme';
import { Text } from './Text';

/** Taille de la coupe diagonale, relevée sur le masque du Figma (358×256 → 32). */
const FOLD = 32;

interface ChoiceCardProps {
  badge: string;
  title: string;
  description: string;
  action: string;
  icon: ReactNode;
  onPress: () => void;
}

/**
 * La grande carte de choix de l'onboarding, reproduite depuis le masque du
 * Figma : `M0 0H358V224L326 256H0V0`.
 *
 * Un `borderRadius` ne peut pas rendre cette forme — le coin n'est pas arrondi,
 * il est **coupé en diagonale**, et le triangle ainsi libéré porte un rabat
 * plus sombre, comme le dos d'une étiquette repliée. D'où le tracé SVG plutôt
 * qu'une simple `View`.
 */
export function ChoiceCard({
  badge,
  title,
  description,
  action,
  icon,
  onPress,
}: Readonly<ChoiceCardProps>) {
  const { colors } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  };

  const { width: w, height: h } = size;
  // Contour : rectangle dont l'angle inférieur droit est rentré de FOLD.
  const outline = `M0 0 H${w} V${h - FOLD} L${w - FOLD} ${h} H0 Z`;
  // Rabat : le triangle que la coupe dégage, replié vers l'intérieur.
  const flap = `M${w - FOLD} ${h - FOLD} H${w} L${w - FOLD} ${h} Z`;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} onLayout={onLayout}>
      {w > 0 && (
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          <Path
            d={outline}
            fill={colors.raised}
            stroke={colors.rule}
            strokeWidth={border.hairline}
          />
          <Path d={flap} fill={colors.sunken} />
        </Svg>
      )}

      {/* La perforation est centrée en haut sur ces cartes, contrairement au
          Stock Tag où elle est en haut à gauche. */}
      <View style={styles.perforationRow}>
        <View style={[styles.perforation, { backgroundColor: colors.paper }]} />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          {icon}
          <View style={[styles.badge, { backgroundColor: colors.rule }]}>
            <Text variant="dataLabel" color="raised">
              {badge}
            </Text>
          </View>
        </View>

        <Text variant="title" color="accent" style={styles.title}>
          {title}
        </Text>
        {/* `rule` serait invisible : la carte est déjà remplie de cette teinte. */}
        <View style={[styles.rule, { backgroundColor: colors.sunken }]} />
        <Text variant="dataBody" color="ink">
          {description}
        </Text>
        <Text variant="dataLabel" color="inkSoft" style={styles.action}>
          Action: {action} →
        </Text>
      </View>
    </Pressable>
  );
}

const PERFORATION = 12;

const styles = StyleSheet.create({
  perforationRow: { alignItems: 'center', paddingTop: spacing.base },
  perforation: {
    width: PERFORATION,
    height: PERFORATION,
    borderRadius: PERFORATION / 2,
  },
  content: { padding: spacing.card, paddingTop: spacing.base },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: { paddingHorizontal: spacing.tight, paddingVertical: spacing.hair },
  title: { marginTop: spacing.card },
  rule: { height: border.hairline, marginVertical: spacing.tight },
  action: { marginTop: spacing.base },
});
