import { StyleSheet, View } from 'react-native';
import { spacing } from '@/theme';
import { Text } from './Text';

interface SystemFooterProps {
  left: string;
  right?: string;
}

/**
 * Ligne d'état en mono capitales, en pied d'écran — « SYSTÈME D'INVENTAIRE
 * PARTAGÉ V2.4 », « STATUT: ATTENTE_ENTRÉE ». Registre volontairement
 * technique, repris des maquettes.
 */
export function SystemFooter({ left, right }: Readonly<SystemFooterProps>) {
  return (
    <View style={styles.row}>
      <Text variant="dataLabel" color="inkSoft">
        {left}
      </Text>
      {right !== undefined && (
        <Text variant="dataLabel" color="inkSoft">
          {right}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
  },
});
