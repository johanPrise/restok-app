import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useItems } from '@/api/items';
import { useCreateRecipe } from '@/api/recipes';
import { BackLink } from '@/components/BackLink';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { FormScreen } from '@/components/FormScreen';
import { Text } from '@/components/Text';
import { BasketIcon } from '@/components/icons';
import { latestFailure } from '@/lib/api-error';
import { useGoBack } from '@/lib/useGoBack';
import type { IngredientInput, Item } from '@/types/api';
import { border, MIN_TOUCH_TARGET, radius, spacing, useTheme } from '@/theme';

const MIN_NAME = 2;
const MAX_SUGGESTIONS = 3;

/** Ce qu'on manipule tant que rien n'est envoyé : un item, ou du texte. */
interface Draft {
  itemId?: string;
  name: string;
}

export default function NewRecipe() {
  const goBack = useGoBack('/recipes');
  const { colors } = useTheme();
  const items = useItems();
  const create = useCreateRecipe();

  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [servings, setServings] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<Draft[]>([]);
  const [draft, setDraft] = useState('');

  const chosen = new Set(
    ingredients.map((ingredient) => ingredient.itemId).filter(Boolean),
  );
  const needle = draft.trim().toLowerCase();
  const suggestions = needle
    ? (items.data ?? [])
        .filter(
          (item) =>
            !chosen.has(item.id) && item.name.toLowerCase().includes(needle),
        )
        .slice(0, MAX_SUGGESTIONS)
    : [];

  const add = (ingredient: Draft) => {
    setDraft('');
    setIngredients((current) => [...current, ingredient]);
  };

  const canSave = name.trim().length >= MIN_NAME;

  const save = () => {
    if (!canSave) return;

    create.mutate(
      {
        name: name.trim(),
        source: source.trim() || undefined,
        description: description.trim() || undefined,
        servings: Number(servings) > 0 ? Number(servings) : undefined,
        ingredients: ingredients.map((ingredient): IngredientInput =>
          ingredient.itemId
            ? { itemId: ingredient.itemId }
            : { label: ingredient.name },
        ),
      },
      { onSuccess: goBack },
    );
  };

  return (
    <FormScreen>
      <BackLink onPress={goBack} />
      <Text variant="title">Nouvelle recette</Text>

      <Field
        label="Nom du plat"
        value={name}
        onChangeText={setName}
        placeholder="Risotto"
        autoFocus
      />

      <Text variant="monoLabel" color="inkSoft" style={styles.section}>
        Ingrédients
      </Text>

      {/* Le lien vers un item de l'étagère est ce qui rend la recette utile :
          un ingrédient libre ne dira jamais si on l'a. D'où la suggestion en
          premier, et le texte libre en repli. */}
      {ingredients.map((ingredient, index) => (
        <Pressable
          key={`${ingredient.name}-${index}`}
          accessibilityRole="button"
          accessibilityLabel={`Retirer ${ingredient.name}`}
          onPress={() =>
            setIngredients((current) =>
              current.filter((_, position) => position !== index),
            )
          }
          style={[styles.chosen, { borderColor: colors.thread }]}
        >
          {ingredient.itemId !== undefined && (
            <BasketIcon color={colors.inkSoft} size={14} />
          )}
          <Text variant="body" style={styles.chosenName} numberOfLines={1}>
            {ingredient.name}
          </Text>
          <Text variant="monoLabel" color="inkSoft">
            Retirer
          </Text>
        </Pressable>
      ))}

      {suggestions.map((item: Item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={`Ajouter ${item.name} depuis l'étagère`}
          onPress={() => add({ itemId: item.id, name: item.name })}
          style={[
            styles.suggestion,
            { backgroundColor: colors.paperRaised, borderColor: colors.thread },
          ]}
        >
          <BasketIcon color={colors.inkSoft} size={14} />
          <Text variant="body" numberOfLines={1}>
            {item.name}
          </Text>
        </Pressable>
      ))}

      <View style={styles.addRow}>
        <Field
          label=""
          value={draft}
          onChangeText={setDraft}
          placeholder="Riz, sel, tomates…"
          onSubmitEditing={() =>
            draft.trim().length >= MIN_NAME && add({ name: draft.trim() })
          }
          style={styles.addField}
        />
        <Button
          variant="secondary"
          label="Ajouter"
          disabled={draft.trim().length < MIN_NAME}
          onPress={() => add({ name: draft.trim() })}
        />
      </View>

      <Field
        label="Où la trouver (facultatif)"
        value={source}
        onChangeText={setSource}
        placeholder="https://… ou « le livre rouge, p. 42 »"
        autoCapitalize="none"
      />

      <Field
        label="Pour combien de personnes (facultatif)"
        value={servings}
        onChangeText={setServings}
        placeholder="4"
        keyboardType="number-pad"
      />

      {/* Ce qui fait une recette, ce n'est pas la liste de ce qu'on sort du
          placard : c'est ce qu'on en fait. Le champ était intitulé « Notes »
          avec un exemple d'ingrédients — il fabriquait donc une seconde liste
          de courses, et personne n'aurait su comment cuisiner le plat. */}
      <Field
        label="Indications"
        value={description}
        onChangeText={setDescription}
        placeholder={
          'Laver la salade et l’essorer.\n' +
          'Égoutter le thon, l’émietter.\n' +
          'Mélanger, assaisonner au dernier moment.'
        }
        multiline
        style={styles.steps}
      />

      <Text variant="caption" color="inkSoft">
        Une étape par ligne. C’est ce qu’on relit en cuisinant — sans ça, la
        fiche ne dit que ce qu’il faut sortir du placard.
      </Text>

      {create.isError && (
        <Text variant="caption" color="rustClay">
          {latestFailure([create])}
        </Text>
      )}

      <Button
        label="Enregistrer"
        disabled={!canSave}
        loading={create.isPending}
        onPress={save}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.sm },
  chosen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm,
    borderWidth: border.hairline,
    borderRadius: radius.button,
  },
  chosenName: { flex: 1 },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm,
    borderWidth: border.hairline,
    borderRadius: radius.button,
  },
  addRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  addField: { flex: 1 },
  steps: { minHeight: 132 },
});
