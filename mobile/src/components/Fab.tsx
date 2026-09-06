import { Pressable, StyleSheet } from 'react-native';
import { chrome, radius, useTheme } from '@/theme';
import { PlusIcon } from './icons';

interface FabProps {
  onPress: () => void;
  /** Obligatoire : le bouton n'a qu'une croix, rien à lire pour un lecteur d'écran. */
  accessibilityLabel: string;
}

/**
 * Bouton flottant d'ajout.
 *
 * Il flotte sur la même couche que la barre d'onglets, au-dessus de l'étagère,
 * et reçoit donc la même **profondeur** : une ombre discrète. Il était resté
 * plat au nom du §3, ce qui le collait au fond pendant que la barre lévitait
 * juste à côté. Voir la règle des deux couches dans `theme/layout`.
 *
 * Ses coins, eux, restent à 12 comme le veut la maquette : la règle des deux
 * couches parle de profondeur, pas de rayon.
 */
export function Fab({ onPress, accessibilityLabel }: Readonly<FabProps>) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: pressed ? colors.accentPress : colors.accent,
        },
      ]}
    >
      <PlusIcon color={colors.onAccent} />
    </Pressable>
  );
}

export const FAB_SIZE = 56;

const styles = StyleSheet.create({
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: radius.base,
    alignItems: 'center',
    justifyContent: 'center',
    ...chrome,
  },
});
