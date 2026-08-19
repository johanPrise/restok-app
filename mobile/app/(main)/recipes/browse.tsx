import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useImportRecipe } from '@/api/recipes';
import { BackLink } from '@/components/BackLink';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { apiErrorMessage } from '@/lib/api-error';
import { useGoBack } from '@/lib/useGoBack';
import { border, spacing, useTheme } from '@/theme';

/**
 * Là où l'on cherche. Un site de recettes plutôt qu'un moteur : on arrive
 * directement sur des recettes, et c'est celui dont on a vérifié qu'il publie
 * ses données structurées. Rien n'empêche de naviguer ailleurs — c'est un
 * navigateur.
 */
const START_URL = 'https://www.marmiton.org/';

/**
 * Chercher une recette sans quitter l'app.
 *
 * C'est la réponse à la vraie objection : on ne peut pas demander à quelqu'un
 * de connaître ses recettes pour lui montrer ce qu'il peut cuisiner. Ici il
 * cherche, il trouve, il met de côté — comme on garde une vidéo. Le lien, il ne
 * le voit jamais : l'app sait sur quelle page il est.
 */
export default function BrowseRecipes() {
  const router = useRouter();
  const goBack = useGoBack('/recipes');
  const { colors } = useTheme();
  const importRecipe = useImportRecipe();

  const [url, setUrl] = useState(START_URL);
  const [title, setTitle] = useState('');
  const webview = useRef<WebView>(null);

  const save = () =>
    importRecipe.mutate(url, {
      onSuccess: (recipe) => router.replace(`/recipes/${recipe.id}`),
    });

  return (
    <Screen padded={false} edges={['top']}>
      <View style={styles.bar}>
        <BackLink onPress={goBack} />
        <Text variant="caption" color="inkSoft" numberOfLines={1}>
          {title || 'Chercher une recette'}
        </Text>
      </View>

      {/* `react-native-webview` n'existe pas sur le web : là-bas on n'a de toute
          façon pas besoin d'un navigateur dans un navigateur. */}
      {Platform.OS === 'web' ? (
        <View style={styles.unsupported}>
          <Text variant="body" color="inkSoft" style={styles.centered}>
            La recherche de recettes se fait depuis l’app mobile.
          </Text>
        </View>
      ) : (
        <WebView
          ref={webview}
          source={{ uri: START_URL }}
          onNavigationStateChange={(state) => {
            setUrl(state.url);
            setTitle(state.title ?? '');
          }}
          style={styles.web}
        />
      )}

      <View style={[styles.footer, { borderTopColor: colors.thread }]}>
        {importRecipe.isError && (
          <Text variant="caption" color="rustClay">
            {apiErrorMessage(importRecipe.error)}
          </Text>
        )}

        <Button
          label="Sauvegarder cette recette"
          loading={importRecipe.isPending}
          onPress={save}
        />

        {/* Le repli quand la page ne publie rien d'exploitable. */}
        <Button
          variant="secondary"
          label="Écrire à la main"
          onPress={() => router.replace('/recipes/new')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  web: { flex: 1 },
  unsupported: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  centered: { textAlign: 'center' },
  footer: {
    padding: spacing.md,
    gap: spacing.xs,
    borderTopWidth: border.hairline,
  },
});
