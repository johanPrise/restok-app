import { StyleSheet, View } from 'react-native';
import { useTabBarSpace } from '@/lib/useTabBarSpace';
import { spacing } from '@/theme';
import { Screen } from './Screen';
import { Text } from './Text';

interface ComingSoonProps {
  title: string;
  /** Ce que l'onglet fera — sans promettre de date. */
  description: string;
}

/**
 * Onglet réservé. Ces écrans existent parce que la barre du Figma a quatre
 * entrées : les masquer déplacerait les deux autres à chaque livraison. Mieux
 * vaut une place tenue qu'une barre qui change de forme.
 *
 * `edges` s'arrête en haut : le bas de l'écran appartient à la barre d'onglets,
 * qui absorbe déjà l'encoche.
 */
export function ComingSoon({ title, description }: Readonly<ComingSoonProps>) {
  const tabBarSpace = useTabBarSpace();

  return (
    <Screen edges={['top']}>
      <View style={[styles.body, { paddingBottom: tabBarSpace }]}>
        <Text variant="monoLabel" color="inkSoft">
          Bientôt
        </Text>
        <Text variant="title" style={styles.centered}>
          {title}
        </Text>
        <Text variant="body" color="inkSoft" style={styles.centered}>
          {description}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  centered: { textAlign: 'center' },
});
