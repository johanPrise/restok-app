import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useItems } from '@/api/items';
import { useIsOnline } from '@/api/network';
import { useRecipes } from '@/api/recipes';
import { Button } from '@/components/Button';
import { FAB_SIZE } from '@/components/Fab';
import { RecipeCard } from '@/components/RecipeCard';
import { Hint } from '@/components/Hint';
import { Screen } from '@/components/Screen';
import { TagCard } from '@/components/TagCard';
import { TagSkeleton } from '@/components/TagSkeleton';
import { Text } from '@/components/Text';
import { useT, useLocale } from '@/i18n/useT';
import { apiErrorMessage } from '@/lib/api-error';
import { offlineNotice } from '@/lib/offline';
import { useHint } from '@/lib/useHint';
import { useSession } from '@/store/session';
import { sortByFeasibility } from '@/lib/recipes';
import { usePendingGestures } from '@/lib/usePendingGestures';
import { spacing, useTheme } from '@/theme';

export default function Recipes() {
  const router = useRouter();
  const { colors } = useTheme();
  const recipes = useRecipes();
  const items = useItems();
  const online = useIsOnline();
  const pending = usePendingGestures();
  const locale = useLocale();
  const t = useT();
  const hint = useHint('recipes');
  const markLearned = useSession((state) => state.markLearned);

  // Le croisement se fait ici, sur deux listes déjà en cache : c'est ce qui
  // permet de décider quoi cuisiner sans réseau.
  const sorted = useMemo(
    () => sortByFeasibility(recipes.data ?? [], items.data ?? [], locale),
    [recipes.data, items.data, locale],
  );

  const ready = sorted.filter((entry) => entry.state.kind === 'ready').length;
  const notice = offlineNotice(
    online,
    pending.durable,
    pending.volatile,
    locale,
  );

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Text variant="display">{t('onglets.recettes')}</Text>
        <Text variant="dataLabel" color="inkSoft">
          {recipes.isError ? t('recettes.nonChargees') : summary(ready, t)}
        </Text>
      </View>

      {notice !== null && (
        <Text variant="caption" color="inkSoft" style={styles.notice}>
          {notice}
        </Text>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: FAB_SIZE + spacing.base },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={recipes.isRefetching}
            onRefresh={() => void recipes.refetch()}
            tintColor={colors.accent}
          />
        }
      >
        {recipes.isPending &&
          Array.from({ length: 3 }, (_, index) => <TagSkeleton key={index} />)}

        {recipes.isError && (
          <ErrorState
            message={apiErrorMessage(recipes.error, locale)}
            onRetry={() => void recipes.refetch()}
          />
        )}

        {!recipes.isPending && !recipes.isError && sorted.length === 0 && (
          <EmptyState
            onBrowse={() => router.push('/recipes/browse')}
            onWrite={() => router.push('/recipes/new')}
          />
        )}

        {/* En tête de liste, là où l'ordre se lit : c'est l'ordre qu'il
            explique, et il ne veut rien dire ailleurs. */}
        {hint !== null && <Hint id={hint} />}

        {sorted.map(({ recipe, state }) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            state={state}
            onPress={() => {
              // Ouvrir une fiche, c'est s'être servi du tri : celle du haut
              // est celle qui manque le moins.
              void markLearned('recipeSort');
              router.push(`/recipes/${recipe.id}`);
            }}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

/**
 * Le résumé répond à la question de l'écran — « qu'est-ce qu'on peut cuisiner
 * ce soir ? » — plutôt que de compter les fiches, ce que personne ne demande.
 */
function summary(
  ready: number,
  t: (key: string, values?: Record<string, number>) => string,
): string {
  if (ready === 0) return t('recettes.rienCeSoir');

  return t('recettes.faisables', { count: ready });
}

function EmptyState({
  onBrowse,
  onWrite,
}: Readonly<{ onBrowse: () => void; onWrite: () => void }>) {
  const t = useT();

  return (
    <TagCard style={styles.empty}>
      <Text variant="title" color="inkSoft" style={styles.centered}>
        {t('recettes.aucuneRecette')}
      </Text>
      {/* La recherche d'abord : personne ne connaît par cœur les plats qu'il
          voudrait cuisiner, et le lui demander serait exiger la réponse avant
          la question. */}
      <Text variant="body" color="inkSoft" style={styles.centered}>
        {t('recettes.aucuneRecetteQuoi')}
      </Text>
      <Button
        label={t('recettes.chercherUneRecette')}
        onPress={onBrowse}
        style={styles.emptyAction}
      />
      <Button
        variant="secondary"
        label={t('recettes.ecrireALaMain')}
        onPress={onWrite}
        style={styles.emptyAction}
      />
    </TagCard>
  );
}

function ErrorState({
  message,
  onRetry,
}: Readonly<{ message: string; onRetry: () => void }>) {
  const t = useT();

  return (
    <View style={styles.error}>
      <Text variant="title" color="out" style={styles.centered}>
        {t('recettes.indisponibles')}
      </Text>
      <Text variant="body" color="inkSoft" style={styles.centered}>
        {message}
      </Text>
      <Button
        label={t('commun.reessayer')}
        onPress={onRetry}
        style={styles.emptyAction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingTop: spacing.base, gap: spacing.hair },
  notice: { marginTop: spacing.tight },
  list: { paddingTop: spacing.base, gap: spacing.base },
  empty: { gap: spacing.tight, paddingVertical: spacing.card },
  emptyAction: { marginTop: spacing.tight, alignSelf: 'stretch' },
  error: {
    alignItems: 'center',
    paddingVertical: spacing.group,
    gap: spacing.tight,
  },
  centered: { textAlign: 'center' },
});
