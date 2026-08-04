import { useColorScheme } from 'react-native';
import { darkPalette, lightPalette, Palette } from './colors';

export * from './colors';
export * from './layout';
export * from './typography';

export interface Theme {
  colors: Palette;
  isDark: boolean;
}

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return { colors: isDark ? darkPalette : lightPalette, isDark };
}
