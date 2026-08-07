import { Pressable, StyleSheet } from 'react-native';
import { radius, useTheme } from '@/theme';
import { PlusIcon } from './icons';

interface FabProps {
  onPress: () => void;
  /** Obligatoire : le bouton n'a qu'une croix, rien à lire pour un lecteur d'écran. */
  accessibilityLabel: string;
}

/**
 * Bouton flottant d'ajout. Carré à coins arrondis comme les tags, et sans
 * ombre portée : le §3 fait venir la profondeur du fil et des aplats, jamais
 * d'une élévation.
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
          backgroundColor: pressed ? colors.pantryTealDeep : colors.pantryTeal,
        },
      ]}
    >
      <PlusIcon color={colors.onPantryTeal} />
    </Pressable>
  );
}

export const FAB_SIZE = 56;

const styles = StyleSheet.create({
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: radius.tag,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
