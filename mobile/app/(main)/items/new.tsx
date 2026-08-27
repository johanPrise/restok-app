import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useCreateItem } from '@/api/items';
import { BackLink } from '@/components/BackLink';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { FormScreen } from '@/components/FormScreen';
import { Segmented } from '@/components/Segmented';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { useLocale, useT } from '@/i18n/useT';
import { apiErrorMessage } from '@/lib/api-error';
import { useGoBack } from '@/lib/useGoBack';
import { useSession } from '@/store/session';
import { spacing } from '@/theme';
import type { CreateItemInput, TrackingType } from '@/types/api';

/** Ce que chaque mode de suivi promet, sous le sélecteur. */
const HINT_KEYS: Record<TrackingType, string> = {
  threshold: 'etagere.presenceQuoi',
  quantity: 'etagere.quantiteQuoi',
};

/**
 * Création d'un item (§5) : une seule colonne, et deux champs seulement tant
 * qu'on reste en suivi binaire. Le mode de suivi s'explique sous le champ,
 * pas derrière une infobulle.
 */
export default function NewItem() {
  const goBack = useGoBack();
  const locale = useLocale();
  const t = useT();
  const toast = useToast();
  const create = useCreateItem();
  const isAdmin = useSession((s) => s.member?.role) === 'admin';

  const [name, setName] = useState('');
  const [mode, setMode] = useState<TrackingType>('threshold');
  const [quantity, setQuantity] = useState('');
  const [threshold, setThreshold] = useState('');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');
  const [pack, setPack] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const counting = mode === 'quantity';
  const errors = validate(t, {
    name,
    counting,
    quantity,
    threshold,
    target,
    unit,
    pack,
  });
  const shown = submitted ? errors : {};

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;

    const input: CreateItemInput = { name: name.trim(), trackingType: mode };
    // Descriptifs : ils valent aussi en suivi binaire, où ils ne s'affichent
    // simplement nulle part.
    if (unit.trim()) input.unit = unit.trim();
    if (pack.trim()) input.packSize = Number(pack);
    if (counting) {
      input.quantity = Number(quantity);
      // Laissés vides, le backend applique ses propres défauts : seuil à 1, et
      // la quantité initiale comme référence de jauge.
      if (threshold.trim()) input.lowThreshold = Number(threshold);
      if (target.trim()) input.targetQuantity = Number(target);
    }

    create.mutate(input, {
      onSuccess: (item) => {
        toast(t('etagere.itemAjoute', { nom: item.name }));
        goBack();
      },
    });
  };

  if (!isAdmin) {
    return (
      <FormScreen>
        <BackLink onPress={goBack} />
        <Text variant="title" style={styles.heading}>
          {t('etagere.reserveAdmins')}
        </Text>
        <Text variant="body" color="inkSoft">
          {t('etagere.reserveAdminsQuoi')}
        </Text>
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      <BackLink onPress={goBack} />

      <View style={styles.header}>
        <Text variant="title">{t('etagere.nouvelItem')}</Text>
        <Text variant="monoLabel" color="inkSoft">
          {t('etagere.sousTitreAjout')}
        </Text>
      </View>

      <View style={styles.form}>
        <Field
          label={t('etagere.nom')}
          value={name}
          onChangeText={setName}
          placeholder={t('etagere.exempleNom')}
          error={shown.name}
          autoCapitalize="sentences"
          returnKeyType="next"
        />

        <Segmented
          label={t('etagere.modeDeSuivi')}
          hint={t(HINT_KEYS[mode])}
          value={mode}
          options={[
            { value: 'threshold' as const, label: t('etagere.presence') },
            { value: 'quantity' as const, label: t('etagere.quantite') },
          ]}
          onChange={setMode}
        />

        {counting && (
          <>
            <Field
              label={t('etagere.quantiteEnStock')}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="6"
              error={shown.quantity}
              keyboardType="number-pad"
              inputMode="numeric"
            />
            <Field
              label={t('etagere.alerteEnDessous')}
              value={threshold}
              onChangeText={setThreshold}
              placeholder="1"
              error={shown.threshold}
              keyboardType="number-pad"
              inputMode="numeric"
            />
            <Field
              label={t('etagere.pleinA')}
              value={target}
              onChangeText={setTarget}
              placeholder={quantity.trim() || t('etagere.identiqueAuStock')}
              error={shown.target}
              keyboardType="number-pad"
              inputMode="numeric"
            />
            <Field
              label={t('etagere.uneUniteSAppelle')}
              value={unit}
              onChangeText={setUnit}
              placeholder={t('etagere.exempleUnite')}
              error={shown.unit}
              autoCapitalize="none"
              maxLength={20}
            />
            <Field
              label={t('etagere.parPaquetDe')}
              value={pack}
              onChangeText={setPack}
              placeholder={t('etagere.videSiUnite')}
              error={shown.pack}
              keyboardType="number-pad"
              inputMode="numeric"
            />
          </>
        )}
      </View>

      {create.isError && (
        <Text variant="caption" color="rustClay" style={styles.error}>
          {apiErrorMessage(create.error, locale)}
        </Text>
      )}

      <Button
        label={t('etagere.ajouterAEtagere')}
        onPress={submit}
        loading={create.isPending}
        style={styles.submit}
      />
    </FormScreen>
  );
}

type Errors = Partial<
  Record<'name' | 'quantity' | 'threshold' | 'target' | 'unit' | 'pack', string>
>;

/**
 * Reprend les contraintes des DTO du backend. Les valider ici évite un
 * aller-retour pour se faire répondre 400, mais le serveur reste seul juge.
 *
 * `t` est passé plutôt que lu : la fonction reste hors composant, donc
 * appelable dans un test sans monter de rendu.
 */
function validate(
  t: (key: string, values?: Record<string, string | number>) => string,
  {
    name,
    counting,
    quantity,
    threshold,
    target,
    unit,
    pack,
  }: {
    name: string;
    counting: boolean;
    quantity: string;
    threshold: string;
    target: string;
    unit: string;
    pack: string;
  },
): Errors {
  const errors: Errors = {};
  const trimmed = name.trim();

  if (trimmed.length < 2) errors.name = t('champs.deuxCaracteres');
  else if (trimmed.length > 100) errors.name = t('champs.centCaracteresMax');

  if (!counting) return errors;

  if (!isWhole(quantity, 0)) {
    errors.quantity = t('champs.entierZeroCompris');
  }
  if (threshold.trim() && !isWhole(threshold, 1)) {
    errors.threshold = t('champs.entierMinimum', { count: 1 });
  }
  if (target.trim() && !isWhole(target, 1)) {
    errors.target = t('champs.entierMinimum', { count: 1 });
  }
  if (unit.trim().length > 20) {
    errors.unit = t('champs.vingtCaracteresMax');
  }
  // Un « paquet de 1 » n'en est pas un : autant le laisser vide.
  if (pack.trim() && !isWhole(pack, 2)) {
    errors.pack = t('champs.entierMinimum', { count: 2 });
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
