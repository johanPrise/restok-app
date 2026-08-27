import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRecipeSearch, useSaveFromCatalogue } from '@/api/recipes';
import { BackLink } from '@/components/BackLink';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TagCard } from '@/components/TagCard';
import { TagSkeleton } from '@/components/TagSkeleton';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { useLocale, useT } from '@/i18n/useT';
import { apiErrorMessage } from '@/lib/api-error';
import { useGoBack } from '@/lib/useGoBack';
import type { RecipeSuggestion } from '@/types/api';
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
 * Chercher une recette, sans en connaître aucune.
 *
 * Le catalogue est celui de Wikilivres : gratuit, sans compte, en français —
 * ce qu'aucune API de recettes commerciale ne propose, y compris payante.
 *
 * Les propositions arrivent **triées par ce qui manque le moins**. C'est la
 * seule chose que cet écran apporte qu'un site de cuisine ne saurait pas
 * faire : n'importe qui sait lister des plats au poulet, personne d'autre ne
 * sait lequel te demandera deux courses plutôt que six.
 */
export default function BrowseRecipes() {
  const router = useRouter();
  const locale = useLocale();
  const t = useT();
  const goBack = useGoBack('/recipes');
  const toast = useToast();
  const { colors } = useTheme();

  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const results = useRecipeSearch(query);
  const save = useSaveFromCatalogue();

  const keep = (suggestion: RecipeSuggestion) =>
    save.mutate(suggestion.ref, {
      onSuccess: (recipe) => {
        toast(t('recettes.gardee', { nom: recipe.name }));
        router.replace(`/recipes/${recipe.id}`);
      },
    });

  return (
    <Screen edges={['top']}>
      <BackLink onPress={goBack} />

      <View style={styles.header}>
        <Text variant="title">{t('recettes.chercher')}</Text>
        <Text variant="monoLabel" color="inkSoft">
          {t('recettes.sousTitreCatalogue')}
        </Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => setQuery(draft)}
          placeholder={t('recettes.quoiManger')}
          placeholderTextColor={colors.inkSoft}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={t('recettes.chercherUneRecette')}
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
          label={t('recettes.chercher')}
          disabled={draft.trim().length < 2}
          onPress={() => setQuery(draft)}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={results.isRefetching}
            onRefresh={() => void results.refetch()}
            tintColor={colors.pantryTeal}
          />
        }
      >
        {query.trim().length < 2 && (
          <Text variant="body" color="inkSoft" style={styles.hint}>
            {t('recettes.astuceRecherche')}
          </Text>
        )}

        {results.isPending &&
          query.trim().length >= 2 &&
          Array.from({ length: 3 }, (_, index) => <TagSkeleton key={index} />)}

        {results.isError && (
          <Text variant="body" color="rustClay" style={styles.hint}>
            {apiErrorMessage(results.error, locale)}
          </Text>
        )}

        {results.isSuccess && results.data.length === 0 && (
          <Text variant="body" color="inkSoft" style={styles.hint}>
            {t('recettes.rienTrouve', { quete: query })}
          </Text>
        )}

        {save.isError && (
          <Text variant="caption" color="rustClay">
            {apiErrorMessage(save.error, locale)}
          </Text>
        )}

        {(results.data ?? []).map((suggestion) => (
          <Suggestion
            key={suggestion.ref}
            suggestion={suggestion}
            busy={save.isPending}
            onKeep={() => keep(suggestion)}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

function Suggestion({
  suggestion,
  busy,
  onKeep,
}: Readonly<{
  suggestion: RecipeSuggestion;
  busy: boolean;
  onKeep: () => void;
}>) {
  const { colors } = useTheme();
  const t = useT();
  const total = suggestion.have.length + suggestion.missing.length;
  const missing = suggestion.missing.length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('recettes.manquantsA11y', {
        nom: suggestion.name,
        count: missing,
      })}
      onPress={onKeep}
      disabled={busy}
    >
      <TagCard
        accentColor={missing === 0 ? colors.sage : undefined}
        style={styles.card}
      >
        <Text variant="tagName" numberOfLines={2}>
          {suggestion.name}
        </Text>

        {/* Le compte d'abord, les noms ensuite : on décide sur le nombre, on
            vérifie sur la liste. */}
        <Text variant="monoLabel" color={missing === 0 ? 'sage' : 'inkSoft'}>
          {missing === 0
            ? t('recettes.toutEstLaAvec', { count: total })
            : t('recettes.compteEtManquants', {
                count: total,
                manquants: missing,
              })}
        </Text>

        {missing > 0 && (
          <Text variant="caption" color="inkSoft" numberOfLines={2}>
            {suggestion.missing.join(' · ')}
          </Text>
        )}
      </TagCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { gap: 2, marginBottom: spacing.md },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  search: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm,
    borderWidth: border.hairline,
    borderRadius: radius.button,
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
  },
  list: { paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  card: { gap: spacing.xs },
  hint: { paddingVertical: spacing.md },
});
