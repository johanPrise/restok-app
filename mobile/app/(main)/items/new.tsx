import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BackLink } from '@/components/BackLink';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { spacing } from '@/theme';

/**
 * Création d'un item — destination du FAB, remplie à l'étape 5.6 : nom, mode de
 * suivi (binaire ou quantité), quantité de départ, seuil bas et quantité de
 * référence pour la jauge.
 *
 * L'écran existe déjà pour que le bouton mène quelque part plutôt que nulle
 * part. `useCreateItem` est prêt côté API.
 */
export default function NewItem() {
  const router = useRouter();

  return (
    <Screen>
      <BackLink onPress={() => router.back()} />

      <View style={styles.body}>
        <Text variant="title">Nouvel item</Text>
        <Text variant="body" color="inkSoft">
          Le formulaire arrive à l&apos;étape suivante.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center', gap: spacing.xs },
});
