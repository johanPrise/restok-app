import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useItems } from '@/api/items';
import { useCreateRecipe } from '@/api/recipes';
import { BackLink } from '@/components/BackLink';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { FormScreen } from '@/components/FormScreen';
import { Text } from '@/components/Text';
import { BasketIcon } from '@/components/icons';
import { apiErrorMessage } from '@/lib/api-error';
import { useGoBack } from '@/lib/useGoBack';
import type { IngredientInput, Item } from '@/types/api';
import {
  border,
  fontFamily,
  fontSize,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  useTheme,
} from '@/theme';

const MIN_NAME = 2;
const MAX_SUGGESTIONS = 3;

/** Ce qu'on manipule tant que rien n'est envoyé : un item, ou du texte. */
interface Draft {
  itemId?: string;
  name: string;
}

/**
 * Écriture d'une recette à la main.
 *
 * Même structure que la création d'item : un en-tête, **un seul conteneur de
 * formulaire à écart constant**, le bouton détaché en bas. Les ingrédients
 * forment un groupe avec son propre rythme interne, parce qu'ils sont une
 * liste et pas un champ.
 */
export default function NewRecipe() {
  const goBack = useGoBack('/recipes');
  const { colors } = useTheme();
  const items = useItems();
  const create = useCreateRecipe();

  const [name, setName] = useState('');
  const [steps, setSteps] = useState('');
  const [source, setSource] = useState('');
  const [servings, setServings] = useState('');
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

  const canAddDraft = draft.trim().length >= MIN_NAME;
  const canSave = name.trim().length >= MIN_NAME;

  const submit = () => {
    if (!canSave) return;

    create.mutate(
      {
        name: name.trim(),
        source: source.trim() || undefined,
        description: steps.trim() || undefined,
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

      <View style={styles.header}>
        <Text variant="title">Nouvelle recette</Text>
        <Text variant="monoLabel" color="inkSoft">
          Recettes / Ajout
        </Text>
      </View>

      <View style={styles.form}>
        <Field
          label="Nom du plat"
          value={name}
          onChangeText={setName}
          placeholder="Risotto aux champignons"
          autoCapitalize="sentences"
          returnKeyType="next"
        />

        <View style={styles.group}>
          <Text variant="monoLabel" color="inkSoft">
            Ingrédients
          </Text>

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
              style={[
                styles.row,
                {
                  backgroundColor: colors.paperRaised,
                  borderColor: colors.thread,
                },
              ]}
            >
              {/* Le panier distingue d'un coup d'œil ce que l'étagère suit —
                  donc ce qui comptera pour la faisabilité — du texte libre. */}
              {ingredient.itemId !== undefined && (
                <BasketIcon color={colors.inkSoft} size={14} />
              )}
              <Text variant="body" style={styles.rowName} numberOfLines={1}>
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
                styles.row,
                styles.suggestion,
                { borderColor: colors.pantryTeal },
              ]}
            >
              <BasketIcon color={colors.pantryTeal} size={14} />
              <Text variant="body" style={styles.rowName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text variant="monoLabel" color="pantryTeal">
                Depuis l’étagère
              </Text>
            </Pressable>
          ))}

          {/* Un `TextInput` nu plutôt qu'un `Field` : celui-ci impose un
              libellé, et un libellé vide laisse une ligne fantôme qui
              désaligne le bouton et creuse l'écart au-dessus. */}
          <View style={styles.addRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Riz, sel, tomates…"
              placeholderTextColor={colors.inkSoft}
              onSubmitEditing={() => canAddDraft && add({ name: draft.trim() })}
              returnKeyType="done"
              accessibilityLabel="Nom d’un ingrédient"
              style={[
                styles.addInput,
                {
                  backgroundColor: colors.paperRaised,
                  borderColor: colors.thread,
                  color: colors.ink,
                },
              ]}
            />
            <Button
              variant="secondary"
              label="Ajouter"
              disabled={!canAddDraft}
              onPress={() => add({ name: draft.trim() })}
            />
          </View>
        </View>

        <Field
          label="Indications"
          value={steps}
          onChangeText={setSteps}
          placeholder={
            'Laver la salade et l’essorer.\n' +
            'Égoutter le thon, l’émietter.\n' +
            'Mélanger, assaisonner au dernier moment.'
          }
          multiline
          style={styles.steps}
        />

        <Text variant="caption" color="inkSoft" style={styles.hint}>
          Une étape par ligne. C’est ce qu’on relit en cuisinant.
        </Text>

        <Field
          label="Où la trouver"
          value={source}
          onChangeText={setSource}
          placeholder="https://… ou « le livre rouge, p. 42 »"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Field
          label="Pour combien de personnes"
          value={servings}
          onChangeText={setServings}
          placeholder="4"
          keyboardType="number-pad"
          inputMode="numeric"
        />
      </View>

      {create.isError && (
        <Text variant="caption" color="rustClay" style={styles.error}>
          {apiErrorMessage(create.error)}
        </Text>
      )}

      <Button
        label="Enregistrer"
        disabled={!canSave}
        loading={create.isPending}
        onPress={submit}
        style={styles.submit}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 2, marginBottom: spacing.lg },
  form: { gap: spacing.md },
  // Les ingrédients sont une liste : leur rythme interne est plus serré que
  // celui qui sépare les champs, sinon le groupe se disloque.
  group: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm,
    borderWidth: border.hairline,
    borderRadius: radius.button,
  },
  // La suggestion se distingue d'un ingrédient déjà retenu : bord teal, fond
  // transparent — elle est une proposition, pas un acquis.
  suggestion: { backgroundColor: 'transparent' },
  rowName: { flex: 1 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  addInput: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm,
    borderWidth: border.hairline,
    borderRadius: radius.button,
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
  },
  steps: { minHeight: 132, paddingTop: spacing.sm },
  hint: { marginTop: -spacing.xs },
  error: { marginTop: spacing.sm },
  submit: { marginTop: spacing.lg },
});
