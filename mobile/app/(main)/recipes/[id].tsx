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
import { TagCard } from '@/components/TagCard';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { latestFailure } from '@/lib/api-error';
import { statusBadge, statusColor } from '@/lib/item-display';
import { feasibility } from '@/lib/recipes';
import { itemsOnList, suggestedQuantity } from '@/lib/shopping-list';
import { useGoBack } from '@/lib/useGoBack';
import type { Item, Recipe } from '@/types/api';
import { border, radius, spacing, textOn, useTheme } from '@/theme';

export default function RecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useGoBack('/recipes');
  const toast = useToast();
  const recipes = useRecipes();
  const items = useItems();
  const shopping = useShoppingList();
  const online = useIsOnline();

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
        <Text variant="tagName" color="inkSoft" style={styles.centered}>
          {recipes.isPending ? 'Chargement…' : 'Recette introuvable'}
        </Text>
      </Screen>
    );
  }

  const state = feasibility(recipe, items.data ?? []);
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

  const failure = latestFailure([take, addLine, remove]);

  const confirmDelete = () =>
    Alert.alert(recipe.name, 'Supprimer cette recette ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => remove.mutate(recipe.id, { onSuccess: goBack }),
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

        <Text variant="monoLabel" color="inkSoft">
          {[
            recipe.servings ? `Pour ${recipe.servings}` : null,
            recipe.createdBy ? `Notée par ${recipe.createdBy}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>

        {recipe.source !== null && (
          <Button
            variant="secondary"
            label="Voir la recette"
            onPress={() => void Linking.openURL(recipe.source!).catch(() => {})}
          />
        )}

        <Text variant="monoLabel" color="inkSoft">
          Ingrédients
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
                { onSuccess: () => toast(`${item.name} signalé épuisé`) },
              )
            }
          />
        ))}

        <Text variant="monoLabel" color="inkSoft" style={styles.section}>
          Indications
        </Text>

        {/* La partie qu'on relit en cuisinant. Une fiche qui ne dit que les
            ingrédients ne permet pas de faire le plat — savoir qu'il y a du
            thon et de la salade n'apprend pas qu'il faut laver l'une avant de
            la mélanger à l'autre. */}
        {recipe.description !== null ? (
          <Steps text={recipe.description} />
        ) : (
          <Text variant="body" color="inkSoft">
            {recipe.source !== null
              ? 'Rien de noté ici — la recette est au bout du lien.'
              : 'Rien de noté. Sans indications, cette fiche ne dit que ce qu’il faut sortir du placard.'}
          </Text>
        )}

        {failure !== null && (
          <Text variant="caption" color="rustClay">
            {failure}
          </Text>
        )}

        {/* La règle du passage de tour se voyait comme une absence : deux
            ingrédients manquants, aucun bouton, aucune explication. */}
        {state.kind === 'missing' && toBuy.length === 0 && (
          <Text variant="caption" color="inkSoft">
            Tout ce qui manque est déjà sur la liste de courses.
          </Text>
        )}

        {toBuy.length > 0 && (
          <Button
            label={`Ajouter ${toBuy.length} manquant${toBuy.length > 1 ? 's' : ''} aux courses`}
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
              toast(
                `${toBuy.length} manquant${toBuy.length > 1 ? 's' : ''} ajouté${toBuy.length > 1 ? 's' : ''} aux courses`,
              );
            }}
          />
        )}

        <Button
          variant="secondary"
          label="Supprimer la recette"
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
      <TagCard>
        <Text variant="body">{text}</Text>
      </TagCard>
    );
  }

  return (
    <TagCard style={styles.steps}>
      {lines.map((line, index) => (
        <View key={`${index}-${line}`} style={styles.step}>
          <Text variant="mono" color="pantryTeal" style={styles.stepNumber}>
            {index + 1}
          </Text>
          <Text variant="body" style={styles.stepText}>
            {line}
          </Text>
        </View>
      ))}
    </TagCard>
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
  const { colors } = useTheme();
  const badge = item ? statusBadge(item) : null;
  const accent = item ? statusColor(item.status) : 'inkSoft';
  const empty =
    item?.status === 'out_of_stock' || item?.status === 'to_restock';

  return (
    <TagCard style={styles.ingredient}>
      <View style={styles.ingredientText}>
        {/* Deux lignes plutôt qu'une troncature : « Pastilles lave-vaisselle
            c… » ne désigne plus rien sur une étagère. */}
        <Text variant="bodyStrong" numberOfLines={2}>
          {name}
        </Text>
        {/* Un ingrédient libre le dit : il ne compte pas dans la faisabilité,
            et personne ne doit s'attendre à ce que l'app en sache l'état. */}
        <Text variant="caption" color="inkSoft">
          {item ? (badge ?? 'En stock') : 'Non suivi'}
        </Text>
      </View>

      {item && !empty && (
        <Button
          variant="secondary"
          label="Il n’y en a plus"
          loading={busy}
          onPress={() => onEmpty(item)}
        />
      )}

      {badge !== null && item && (
        <View style={[styles.pill, { backgroundColor: colors[accent] }]}>
          <Text variant="monoLabel" color={textOn(accent)}>
            {badge}
          </Text>
        </View>
      )}
    </TagCard>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: spacing.xl, gap: spacing.sm },
  centered: { textAlign: 'center', marginTop: spacing.xl },
  ingredient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ingredientText: { flex: 1 },
  section: { marginTop: spacing.sm },
  steps: { gap: spacing.sm },
  step: { flexDirection: 'row', gap: spacing.sm },
  stepNumber: { minWidth: spacing.md },
  stepText: { flex: 1 },
  pill: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.button,
    borderWidth: border.hairline,
    borderColor: 'transparent',
  },
});
