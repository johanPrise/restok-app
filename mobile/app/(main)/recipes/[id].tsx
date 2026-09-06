import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useItems, useTakeItem } from '@/api/items';
import { useIsOnline } from '@/api/network';
import { useDeleteRecipe, useRecipes } from '@/api/recipes';
import { useAddShoppingLine, useShoppingList } from '@/api/shopping';
import { BackLink } from '@/components/BackLink';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { latestFailure } from '@/lib/api-error';
import { statusBadge, statusColor } from '@/lib/item-display';
import { feasibility, recipeByline } from '@/lib/recipes';
import { itemsOnList, suggestedQuantity } from '@/lib/shopping-list';
import { useGoBack } from '@/lib/useGoBack';
import { useIsSolo } from '@/lib/useIsSolo';
import { useLocale, useT } from '@/i18n/useT';
import type { Item } from '@/types/api';
import { spacing } from '@/theme';

export default function RecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useGoBack('/recipes');
  const toast = useToast();
  const recipes = useRecipes();
  const items = useItems();
  const shopping = useShoppingList();
  const online = useIsOnline();
  const solo = useIsSolo();
  const locale = useLocale();
  const t = useT();

  const take = useTakeItem();
  const addLine = useAddShoppingLine();
  const remove = useDeleteRecipe();

  const recipe = recipes.data?.find((entry) => entry.id === id);
  const byId = useMemo(
    () => new Map((items.data ?? []).map((item) => [item.id, item])),
    [items.data],
  );

  if (!recipe) {
    return (
      <Screen>
        <BackLink onPress={goBack} />
        <Text variant="title" color="inkSoft" style={styles.centered}>
          {t(recipes.isPending ? 'commun.chargement' : 'recettes.introuvable')}
        </Text>
      </Screen>
    );
  }

  const state = feasibility(recipe, items.data ?? []);
  const byline = recipeByline(recipe, locale, solo);
  const onList = itemsOnList(shopping.data ?? []);

  // Ce qui manque **et** n'est pas déjà sur la liste : reverser une deuxième
  // fois ne créerait rien, l'API refuserait le doublon.
  const toBuy = (state.kind === 'missing' ? state.items : [])
    .map((name) =>
      recipe.ingredients.find((ingredient) => ingredient.name === name),
    )
    .map((ingredient) =>
      ingredient?.itemId ? byId.get(ingredient.itemId) : undefined,
    )
    .filter((item): item is Item => item !== undefined && !onList.has(item.id));

  const failure = latestFailure([take, addLine, remove], locale);

  const confirmDelete = () =>
    Alert.alert(recipe.name, t('recettes.supprimerConfirm'), [
      { text: t('commun.annuler'), style: 'cancel' },
      {
        text: t('commun.supprimer'),
        style: 'destructive',
        onPress: () =>
          remove.mutate(recipe.id, {
            onSuccess: () => {
              toast(t('recettes.supprimee', { nom: recipe.name }));
              goBack();
            },
          }),
      },
    ]);

  return (
    <Screen>
      <BackLink onPress={goBack} />

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="title">{recipe.name}</Text>

        {byline !== null && (
          <Text variant="dataLabel" color="inkSoft">
            {byline}
          </Text>
        )}

        {recipe.source !== null && (
          <Button
            variant="secondary"
            label={t('recettes.voirLaRecette')}
            onPress={() => void Linking.openURL(recipe.source!).catch(() => {})}
          />
        )}

        <Text variant="dataLabel" color="inkSoft">
          {t('recettes.ingredients')}
        </Text>

        {recipe.ingredients.map((ingredient) => (
          <IngredientRow
            key={ingredient.id}
            name={ingredient.name}
            item={ingredient.itemId ? byId.get(ingredient.itemId) : undefined}
            busy={take.isPending}
            onEmpty={(item) =>
              take.mutate(
                {
                  itemId: item.id,
                  // La quantité connue au moment du geste, jamais un nombre
                  // volontairement trop grand : mis en file, celui-ci
                  // effacerait un rachat fait entre-temps par quelqu'un
                  // d'autre.
                  quantity: item.quantity ?? undefined,
                },
                // L'étagère et le journal changent ailleurs qu'ici.
                {
                  onSuccess: () =>
                    toast(t('recettes.signaleEpuise', { nom: item.name })),
                },
              )
            }
          />
        ))}

        <Text variant="dataLabel" color="inkSoft" style={styles.section}>
          {t('recettes.indications')}
        </Text>

        {/* La partie qu'on relit en cuisinant. Une fiche qui ne dit que les
            ingrédients ne permet pas de faire le plat — savoir qu'il y a du
            thon et de la salade n'apprend pas qu'il faut laver l'une avant de
            la mélanger à l'autre. */}
        {recipe.description !== null ? (
          <Steps text={recipe.description} />
        ) : (
          <Text variant="body" color="inkSoft">
            {t(
              recipe.source !== null
                ? 'recettes.rienDeNoteLien'
                : 'recettes.rienDeNote',
            )}
          </Text>
        )}

        {failure !== null && (
          <Text variant="caption" color="out">
            {failure}
          </Text>
        )}

        {/* La règle du passage de tour se voyait comme une absence : deux
            ingrédients manquants, aucun bouton, aucune explication. */}
        {state.kind === 'missing' && toBuy.length === 0 && (
          <Text variant="caption" color="inkSoft">
            {t('recettes.toutDejaSurListe')}
          </Text>
        )}

        {toBuy.length > 0 && (
          <Button
            label={t('recettes.ajouterManquants', { count: toBuy.length })}
            loading={addLine.isPending}
            disabled={!online}
            onPress={() => {
              // Les lignes atterrissent dans un autre onglet : sans un mot,
              // rien ici ne dit que le geste a porté.
              toBuy.forEach((item) =>
                addLine.mutate({
                  itemId: item.id,
                  quantity: suggestedQuantity(item),
                }),
              );
              toast(t('recettes.manquantsAjoutes', { count: toBuy.length }));
            }}
          />
        )}

        <Button
          variant="secondary"
          label={t('recettes.supprimerLaRecette')}
          onPress={confirmDelete}
        />
      </ScrollView>
    </Screen>
  );
}

/**
 * Les indications, une étape par ligne.
 *
 * Numérotées à l'affichage plutôt qu'à la saisie : personne n'a envie de taper
 * « 1. » « 2. » au pouce, et une ligne renumérotée à la main se désaccorde dès
 * qu'on en insère une. Un paragraphe unique reste un paragraphe — on ne
 * découpe que ce que l'auteur a séparé.
 */
function Steps({ text }: Readonly<{ text: string }>) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return (
      <Card>
        <Text variant="body">{text}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.steps}>
      {lines.map((line, index) => (
        <View key={`${index}-${line}`} style={styles.step}>
          <Text variant="data" color="accent" style={styles.stepNumber}>
            {index + 1}
          </Text>
          <Text variant="body" style={styles.stepText}>
            {line}
          </Text>
        </View>
      ))}
    </Card>
  );
}

/**
 * Un ingrédient, avec le seul geste que la v1 propose : « il n'y en a plus ».
 *
 * Pas de compteur — ce que le tri lit, c'est le statut, pas la quantité. Et un
 * bouton « j'ai pris 1 » viderait un paquet entier pour un plat qui n'en prend
 * qu'une part, fabriquant précisément la donnée fausse que cet écran lit.
 */
function IngredientRow({
  name,
  item,
  busy,
  onEmpty,
}: Readonly<{
  name: string;
  item: Item | undefined;
  busy: boolean;
  onEmpty: (item: Item) => void;
}>) {
  // Le hook est appelé sans condition : `item ? … useLocale() … : null` le
  // sautait quand l'item manquait, ce que React interdit et que le typage ne
  // voit pas.
  const locale = useLocale();
  const t = useT();
  const badge = item ? statusBadge(item, locale) : null;
  const accent = item ? statusColor(item.status) : 'inkSoft';
  const empty =
    item?.status === 'out_of_stock' || item?.status === 'to_restock';

  return (
    <Card style={styles.ingredient}>
      <View style={styles.ingredientText}>
        {/* Deux lignes plutôt qu'une troncature : « Pastilles lave-vaisselle
            c… » ne désigne plus rien sur une étagère. */}
        <Text variant="bodyStrong" numberOfLines={2}>
          {name}
        </Text>
        {/* Un ingrédient libre le dit : il ne compte pas dans la faisabilité,
            et personne ne doit s'attendre à ce que l'app en sache l'état. */}
        <Text variant="caption" color="inkSoft">
          {item ? (badge ?? t('recettes.enStock')) : t('recettes.nonSuivi')}
        </Text>
      </View>

      {item && !empty && (
        <Button
          variant="secondary"
          label={t('recettes.ilNyEnAPlus')}
          loading={busy}
          onPress={() => onEmpty(item)}
        />
      )}

      {badge !== null && item && (
        <Text variant="dataLabel" color={accent}>
          {badge}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: spacing.group, gap: spacing.tight },
  centered: { textAlign: 'center', marginTop: spacing.group },
  ingredient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.tight,
  },
  ingredientText: { flex: 1 },
  section: { marginTop: spacing.tight },
  steps: { gap: spacing.tight },
  step: { flexDirection: 'row', gap: spacing.tight },
  stepNumber: { minWidth: spacing.base },
  stepText: { flex: 1 },
});
