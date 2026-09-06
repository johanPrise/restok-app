import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRenameGroup } from '@/api/groups';
import { apiErrorMessage } from '@/lib/api-error';
import { useIsSolo } from '@/lib/useIsSolo';
import { useLocale, useT } from '@/i18n/useT';
import { useSession } from '@/store/session';
import {
  border,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  textStyles,
  useTheme,
} from '@/theme';
import { Text } from './Text';
import { useToast } from './Toast';

interface EditableGroupNameProps {
  name: string;
  /** Seul un admin renomme ; pour les autres, c'est un simple titre. */
  editable: boolean;
}

/** Aligné sur UpdateGroupDto côté backend. */
const MIN_LENGTH = 2;
const MAX_LENGTH = 100;

/**
 * Le nom du groupe se change en tapant dessus (§7), pas au fond des réglages :
 * c'est là qu'on le lit, donc c'est là qu'on le corrige.
 *
 * Seul, ce n'est pas un groupe mais un inventaire, et les réglages le disent
 * déjà. Ce que l'œil lit et ce que le lecteur d'écran annonce doivent nommer
 * la même chose — c'est pourquoi `solo` se lit ici plutôt que de descendre en
 * `prop` : l'appelant n'a rien à décider.
 */
export function EditableGroupName({
  name,
  editable,
}: Readonly<EditableGroupNameProps>) {
  const { colors } = useTheme();
  const t = useT();
  const locale = useLocale();
  const rename = useRenameGroup();
  const toast = useToast();
  const solo = useIsSolo();
  const markLearned = useSession((s) => s.markLearned);
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    const next = (draft ?? '').trim();
    setDraft(null);

    // Un nom trop court ou inchangé n'a pas à faire un aller-retour réseau.
    if (next.length < MIN_LENGTH || next === name) return;

    // Le repère qui enseigne ce geste n'a plus rien à apprendre à quelqu'un
    // qui vient de le faire.
    void markLearned('rename');
    rename.mutate(next, {
      onSuccess: () =>
        toast(
          t(
            solo ? 'parametres.inventaireRenomme' : 'parametres.groupeRenomme',
            {
              nom: next,
            },
          ),
        ),
    });
  };

  if (draft === null) {
    return (
      <View style={styles.wrap}>
        <Pressable
          accessibilityRole={editable ? 'button' : 'header'}
          accessibilityLabel={
            editable
              ? t(
                  solo
                    ? 'parametres.renommerInventaire'
                    : 'parametres.renommerGroupe',
                  { nom: name },
                )
              : name
          }
          disabled={!editable}
          onPress={() => setDraft(name)}
          // Le seul chemin pour renommer un groupe, en tête de l'écran
          // principal, faisait 26pt de haut — l'interligne du titre, sans plus.
          style={styles.rename}
        >
          <Text variant="title" numberOfLines={1} style={styles.text}>
            {name}
          </Text>
        </Pressable>

        {rename.isError && (
          <Text variant="caption" color="out" style={styles.text}>
            {apiErrorMessage(rename.error, locale)}
          </Text>
        )}
      </View>
    );
  }

  return (
    <TextInput
      value={draft}
      onChangeText={setDraft}
      onSubmitEditing={commit}
      onBlur={commit}
      autoFocus
      selectTextOnFocus
      maxLength={MAX_LENGTH}
      returnKeyType="done"
      textAlign="center"
      accessibilityLabel={t(
        solo ? 'parametres.nomDeTonInventaire' : 'parametres.nomDuGroupe',
      )}
      style={[
        styles.input,
        textStyles.title,
        { color: colors.ink, borderColor: colors.accent },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  // En tête d'écran, pas rangé dans un coin : c'est ce que le groupe partage.
  wrap: { alignItems: 'center' },
  rename: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
  text: { textAlign: 'center' },
  input: {
    // Le champ garde exactement la place du titre : la page ne saute pas quand
    // on passe de l'un à l'autre.
    padding: 0,
    paddingHorizontal: spacing.tight,
    marginHorizontal: -spacing.tight,
    borderWidth: border.hairline,
    borderRadius: radius.base,
    textAlign: 'center',
  },
});
