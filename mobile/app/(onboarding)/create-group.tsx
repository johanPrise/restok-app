import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useCreateGroup } from '@/api/groups';
import { BackLink } from '@/components/BackLink';
import { useGoBack } from '@/lib/useGoBack';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { FormScreen } from '@/components/FormScreen';
import { SystemFooter } from '@/components/SystemFooter';
import { TagCard } from '@/components/TagCard';
import { Text } from '@/components/Text';
import type { GroupType } from '@/types/api';
import { border, radius, spacing, useTheme } from '@/theme';

const TYPES: { value: GroupType; label: string }[] = [
  { value: 'roommates', label: 'Colocation' },
  { value: 'association', label: 'Association' },
];

export default function CreateGroup() {
  const router = useRouter();
  const goBack = useGoBack('/choose');
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [type, setType] = useState<GroupType>('roommates');
  const create = useCreateGroup();

  const isValid = name.trim().length >= 2;

  return (
    <FormScreen>
      <BackLink onPress={goBack} />

      <TagCard>
        <Text variant="tagName">Créer un groupe</Text>
        <Text variant="body" color="inkSoft" style={styles.intro}>
          Vous en devenez l&apos;administrateur. Un code d&apos;invitation sera
          généré pour les autres.
        </Text>

        <View style={styles.form}>
          <Field
            label="Nom du groupe"
            value={name}
            onChangeText={setName}
            placeholder="Coloc Rue Ordener"
            autoFocus
            maxLength={100}
          />

          <View style={styles.group}>
            <Text variant="monoLabel" color="inkSoft">
              Type
            </Text>
            <View style={styles.segmented}>
              {TYPES.map((option) => {
                const selected = option.value === type;
                return (
                  <Text
                    key={option.value}
                    variant="bodyStrong"
                    color={selected ? 'paperRaised' : 'inkSoft'}
                    onPress={() => setType(option.value)}
                    style={[
                      styles.segment,
                      {
                        backgroundColor: selected
                          ? colors.pantryTeal
                          : 'transparent',
                        borderColor: colors.thread,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                );
              })}
            </View>
          </View>
        </View>

        {create.isError && (
          <Text variant="caption" color="rustClay" style={styles.error}>
            {create.error.message}
          </Text>
        )}

        <Button
          label="Créer le groupe"
          onPress={() =>
            create.mutate(
              { name: name.trim(), type },
              { onSuccess: () => router.replace('/') },
            )
          }
          disabled={!isValid}
          loading={create.isPending}
          style={styles.submit}
        />

        <View style={[styles.rule, { backgroundColor: colors.thread }]} />
        <SystemFooter left="Statut: configuration" />
      </TagCard>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: spacing.sm },
  form: { gap: spacing.md, marginTop: spacing.md },
  group: { gap: spacing.xs },
  segmented: { flexDirection: 'row', gap: spacing.xs },
  segment: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    borderWidth: border.hairline,
    borderRadius: radius.button,
    overflow: 'hidden',
  },
  error: { marginTop: spacing.sm },
  submit: { marginTop: spacing.md },
  rule: { height: border.hairline, marginTop: spacing.md },
});
