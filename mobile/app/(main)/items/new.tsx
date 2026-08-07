import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useCreateItem } from '@/api/items';
import { BackLink } from '@/components/BackLink';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { FormScreen } from '@/components/FormScreen';
import { Segmented } from '@/components/Segmented';
import { Text } from '@/components/Text';
import { useGoBack } from '@/lib/useGoBack';
import { useSession } from '@/store/session';
import { spacing } from '@/theme';
import type { CreateItemInput, TrackingType } from '@/types/api';

const MODES = [
  { value: 'threshold' as const, label: 'Présence' },
  { value: 'quantity' as const, label: 'Quantité' },
];

const HINTS: Record<TrackingType, string> = {
  threshold: "L'item est là, ou il n'y est plus. Rien à compter.",
  quantity: 'On décompte les unités, et la jauge montre ce qu’il reste.',
};

/**
 * Création d'un item (§5) : une seule colonne, et deux champs seulement tant
 * qu'on reste en suivi binaire. Le mode de suivi s'explique sous le champ,
 * pas derrière une infobulle.
 */
export default function NewItem() {
  const goBack = useGoBack();
  const create = useCreateItem();
  const isAdmin = useSession((s) => s.member?.role) === 'admin';

  const [name, setName] = useState('');
  const [mode, setMode] = useState<TrackingType>('threshold');
  const [quantity, setQuantity] = useState('');
  const [threshold, setThreshold] = useState('');
  const [target, setTarget] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const counting = mode === 'quantity';
  const errors = validate({ name, counting, quantity, threshold, target });
  const shown = submitted ? errors : {};

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;

    const input: CreateItemInput = { name: name.trim(), trackingType: mode };
    if (counting) {
      input.quantity = Number(quantity);
      // Laissés vides, le backend applique ses propres défauts : seuil à 1, et
      // la quantité initiale comme référence de jauge.
      if (threshold.trim()) input.lowThreshold = Number(threshold);
      if (target.trim()) input.targetQuantity = Number(target);
    }

    create.mutate(input, { onSuccess: goBack });
  };

  if (!isAdmin) {
    return (
      <FormScreen>
        <BackLink onPress={goBack} />
        <Text variant="title" style={styles.heading}>
          Réservé aux admins
        </Text>
        <Text variant="body" color="inkSoft">
          Seul un administrateur du groupe ajoute des items. Demande-lui de
          créer celui qui manque.
        </Text>
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      <BackLink onPress={goBack} />

      <View style={styles.header}>
        <Text variant="title">Nouvel item</Text>
        <Text variant="monoLabel" color="inkSoft">
          Étagère / Ajout
        </Text>
      </View>

      <View style={styles.form}>
        <Field
          label="Nom"
          value={name}
          onChangeText={setName}
          placeholder="Papier toilette"
          error={shown.name}
          autoCapitalize="sentences"
          returnKeyType="next"
        />

        <Segmented
          label="Mode de suivi"
          hint={HINTS[mode]}
          value={mode}
          options={MODES}
          onChange={setMode}
        />

        {counting && (
          <>
            <Field
              label="Quantité en stock"
              value={quantity}
              onChangeText={setQuantity}
              placeholder="6"
              error={shown.quantity}
              keyboardType="number-pad"
              inputMode="numeric"
            />
            <Field
              label="Alerte en dessous de"
              value={threshold}
              onChangeText={setThreshold}
              placeholder="1"
              error={shown.threshold}
              keyboardType="number-pad"
              inputMode="numeric"
            />
            <Field
              label="Plein à"
              value={target}
              onChangeText={setTarget}
              placeholder={quantity.trim() || 'identique au stock'}
              error={shown.target}
              keyboardType="number-pad"
              inputMode="numeric"
            />
          </>
        )}
      </View>

      {create.isError && (
        <Text variant="caption" color="rustClay" style={styles.error}>
          {create.error.message}
        </Text>
      )}

      <Button
        label="Ajouter à l'étagère"
        onPress={submit}
        loading={create.isPending}
        style={styles.submit}
      />
    </FormScreen>
  );
}

type Errors = Partial<
  Record<'name' | 'quantity' | 'threshold' | 'target', string>
>;

/**
 * Reprend les contraintes des DTO du backend. Les valider ici évite un
 * aller-retour pour se faire répondre 400, mais le serveur reste seul juge.
 */
function validate({
  name,
  counting,
  quantity,
  threshold,
  target,
}: {
  name: string;
  counting: boolean;
  quantity: string;
  threshold: string;
  target: string;
}): Errors {
  const errors: Errors = {};
  const trimmed = name.trim();

  if (trimmed.length < 2) errors.name = 'Au moins deux caractères.';
  else if (trimmed.length > 100) errors.name = 'Cent caractères au maximum.';

  if (!counting) return errors;

  if (!isWhole(quantity, 0)) {
    errors.quantity = 'Un nombre entier, zéro compris.';
  }
  if (threshold.trim() && !isWhole(threshold, 1)) {
    errors.threshold = 'Un nombre entier, au moins 1.';
  }
  if (target.trim() && !isWhole(target, 1)) {
    errors.target = 'Un nombre entier, au moins 1.';
  }

  return errors;
}

function isWhole(raw: string, min: number): boolean {
  const value = Number(raw.trim());

  return raw.trim() !== '' && Number.isInteger(value) && value >= min;
}

const styles = StyleSheet.create({
  header: { gap: 2, marginBottom: spacing.lg },
  heading: { marginTop: spacing.md },
  form: { gap: spacing.md },
  error: { marginTop: spacing.sm },
  submit: { marginTop: spacing.lg },
});
