import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useItems } from '@/api/items';
import { BackLink } from '@/components/BackLink';
import { Screen } from '@/components/Screen';
import { StockTag } from '@/components/StockTag';
import { Text } from '@/components/Text';
import { spacing } from '@/theme';

/**
 * Détail d'un item — squelette de l'étape 5.6, qui y ajoutera les boutons
 * d'action et l'historique en ticket de caisse.
 *
 * L'item est lu depuis la liste déjà en cache plutôt que par une requête
 * dédiée : le backend n'expose pas `GET /items/:id`. Un lien profond ouvert à
 * froid ne trouvera donc rien — c'est le trou signalé à l'étape 3.
 */
export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const items = useItems();

  const item = items.data?.find((candidate) => candidate.id === id);

  return (
    <Screen>
      <BackLink onPress={() => router.back()} />

      <View style={styles.body}>
        {item ? (
          <StockTag item={item} />
        ) : (
          <Text variant="body" color="inkSoft">
            Item introuvable — reviens à l&apos;étagère et réessaie.
          </Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center', gap: spacing.md },
});
