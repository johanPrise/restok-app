import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
} from 'react-native';
import { Palette, TextVariant, textStyles, useTheme } from '@/theme';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  /** Clé de la palette. `ink` par défaut. */
  color?: keyof Palette;
}

export function Text({
  variant = 'body',
  color = 'ink',
  style,
  ...props
}: TextProps) {
  const { colors } = useTheme();

  return (
    <RNText
      {...props}
      style={StyleSheet.compose(
        [textStyles[variant], { color: colors[color] }],
        style,
      )}
    />
  );
}
