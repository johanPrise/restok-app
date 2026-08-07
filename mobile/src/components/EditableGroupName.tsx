import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRenameGroup } from '@/api/groups';
import { border, radius, spacing, textStyles, useTheme } from '@/theme';
import { Text } from './Text';

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
 */
export function EditableGroupName({
  name,
  editable,
}: Readonly<EditableGroupNameProps>) {
  const { colors } = useTheme();
  const rename = useRenameGroup();
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    const next = (draft ?? '').trim();
    setDraft(null);

    // Un nom trop court ou inchangé n'a pas à faire un aller-retour réseau.
    if (next.length < MIN_LENGTH || next === name) return;
    rename.mutate(next);
  };

  if (draft === null) {
    return (
      <View>
        <Pressable
          accessibilityRole={editable ? 'button' : 'header'}
          accessibilityLabel={
            editable ? `${name}, appuie pour renommer le groupe` : name
          }
          disabled={!editable}
          onPress={() => setDraft(name)}
        >
          <Text variant="title" numberOfLines={1}>
            {name}
          </Text>
        </Pressable>

        {rename.isError && (
          <Text variant="caption" color="rustClay">
            {rename.error.message}
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
      accessibilityLabel="Nom du groupe"
      style={[
        styles.input,
        textStyles.title,
        { color: colors.ink, borderColor: colors.pantryTeal },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    // Le champ garde exactement la place du titre : la page ne saute pas quand
    // on passe de l'un à l'autre.
    padding: 0,
    paddingHorizontal: spacing.xs,
    marginHorizontal: -spacing.xs,
    borderWidth: border.hairline,
    borderRadius: radius.button,
  },
});
