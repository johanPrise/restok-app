import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useItems } from '@/api/items';
import { useIsOnline } from '@/api/network';
import { useRecipes } from '@/api/recipes';
import { Button } from '@/components/Button';
import { FAB_SIZE } from '@/components/Fab';
import { RecipeCard } from '@/components/RecipeCard';
import { Screen } from '@/components/Screen';
import { TagCard } from '@/components/TagCard';
import { TagSkeleton } from '@/components/TagSkeleton';
import { Text } from '@/components/Text';
import { apiErrorMessage } from '@/lib/api-error';
import { offlineNotice } from '@/lib/offline';
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

  // Le croisement se fait ici, sur deux listes déjà en cache : c'est ce qui
  // permet de décider quoi cuisiner sans réseau.
  const sorted = useMemo(
    () => sortByFeasibility(recipes.data ?? [], items.data ?? []),
    [recipes.data, items.data],
  );

  const ready = sorted.filter((entry) => entry.state.kind === 'ready').length;
  const notice = offlineNotice(online, pending.durable, pending.volatile);

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Text variant="display">Recettes</Text>
        <Text variant="monoLabel" color="inkSoft">
          {recipes.isError ? 'Recettes non chargées' : summary(ready)}
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
          { paddingBottom: FAB_SIZE + spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={recipes.isRefetching}
            onRefresh={() => void recipes.refetch()}
            tintColor={colors.pantryTeal}
          />
        }
      >
        {recipes.isPending &&
          Array.from({ length: 3 }, (_, index) => <TagSkeleton key={index} />)}

        {recipes.isError && (
          <ErrorState
            message={apiErrorMessage(recipes.error)}
            onRetry={() => void recipes.refetch()}
          />
        )}

        {!recipes.isPending && !recipes.isError && sorted.length === 0 && (
          <EmptyState
            onBrowse={() => router.push('/recipes/browse')}
            onWrite={() => router.push('/recipes/new')}
          />
        )}

        {sorted.map(({ recipe, state }) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            state={state}
            onPress={() => router.push(`/recipes/${recipe.id}`)}
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
function summary(ready: number): string {
  if (ready === 0) return 'Rien de faisable ce soir';

  return `${ready} plat${ready > 1 ? 's' : ''} faisable${ready > 1 ? 's' : ''}`;
}

function EmptyState({
  onBrowse,
  onWrite,
}: Readonly<{ onBrowse: () => void; onWrite: () => void }>) {
  return (
    <TagCard style={styles.empty}>
      <Text variant="tagName" color="inkSoft" style={styles.centered}>
        Aucune recette
      </Text>
      {/* La recherche d'abord : personne ne connaît par cœur les plats qu'il
          voudrait cuisiner, et le lui demander serait exiger la réponse avant
          la question. */}
      <Text variant="body" color="inkSoft" style={styles.centered}>
        Cherche des recettes et garde celles qui te tentent. L’app dira
        lesquelles sont faisables avec ce qu’il y a dans le placard.
      </Text>
      <Button
        label="Chercher une recette"
        onPress={onBrowse}
        style={styles.emptyAction}
      />
      <Button
        variant="secondary"
        label="Écrire à la main"
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
  return (
    <View style={styles.error}>
      <Text variant="tagName" color="rustClay" style={styles.centered}>
        Recettes indisponibles
      </Text>
      <Text variant="body" color="inkSoft" style={styles.centered}>
        {message}
      </Text>
      <Button label="Réessayer" onPress={onRetry} style={styles.emptyAction} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingTop: spacing.sm, gap: 2 },
  notice: { marginTop: spacing.xs },
  list: { paddingTop: spacing.md, gap: spacing.md },
  empty: { gap: spacing.xs, paddingVertical: spacing.lg },
  emptyAction: { marginTop: spacing.sm, alignSelf: 'stretch' },
  error: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.xs },
  centered: { textAlign: 'center' },
});
