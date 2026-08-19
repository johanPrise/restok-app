import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useImportRecipe } from '@/api/recipes';
import { BackLink } from '@/components/BackLink';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { apiErrorMessage } from '@/lib/api-error';
import { useGoBack } from '@/lib/useGoBack';
import {
  border,
  fontFamily,
  fontSize,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  useTheme,
} from '@/theme';

/**
 * La recherche du site, pas sa page d'accueil.
 *
 * Déposer quelqu'un sur un site de cuisine en lui disant « cherche » n'est pas
 * une recherche de recettes, c'est lui refiler le travail. Ici il tape ce qu'il
 * veut manger et voit des résultats.
 *
 * Aucune API française de recettes n'existe : les deux qui font ce métier —
 * Spoonacular, Edamam — demandent un compte et ne renvoient que de l'anglais,
 * et « salade » n'y donne rien. Faute de mieux, on interroge la recherche d'un
 * site qui, lui, publie ses recettes en données structurées.
 */
const SEARCH_URL = 'https://www.marmiton.org/recettes/recherche.aspx?aqt=';

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

  const [query, setQuery] = useState('');
  const [target, setTarget] = useState(SEARCH_URL);
  const [url, setUrl] = useState(SEARCH_URL);
  const [title, setTitle] = useState('');
  const webview = useRef<WebView>(null);

  const search = () => {
    const wanted = query.trim();
    if (wanted.length === 0) return;
    // La clé force le rechargement même si l'on relance la même recherche.
    setTarget(SEARCH_URL + encodeURIComponent(wanted) + `#${Date.now()}`);
  };

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

      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          placeholder="Qu’est-ce que tu veux manger ?"
          placeholderTextColor={colors.inkSoft}
          returnKeyType="search"
          autoCapitalize="none"
          accessibilityLabel="Chercher une recette"
          style={[
            styles.search,
            {
              backgroundColor: colors.paperRaised,
              borderColor: colors.thread,
              color: colors.ink,
            },
          ]}
        />
        <Button
          variant="secondary"
          label="Chercher"
          disabled={query.trim().length === 0}
          onPress={search}
        />
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
          source={{ uri: target }}
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  search: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm,
    borderWidth: border.hairline,
    borderRadius: radius.button,
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
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
