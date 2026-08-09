import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabBar } from '@/theme';

/**
 * Hauteur à réserver au bas d'un écran d'onglet.
 *
 * La barre flotte au-dessus du contenu — c'est ce qui donne au verre dépoli
 * quelque chose à flouter — donc rien ne la pousse : sans cette réserve, le
 * dernier élément d'une liste reste définitivement caché dessous.
 */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();

  return tabBar.height + tabBar.gap * 2 + Math.max(insets.bottom, tabBar.gap);
}
