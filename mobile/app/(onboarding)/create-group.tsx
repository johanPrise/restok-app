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
import { useToast } from '@/components/Toast';
import { useLocale, useT } from '@/i18n/useT';
import { apiErrorMessage } from '@/lib/api-error';
import type { GroupType } from '@/types/api';
import { border, radius, spacing, useTheme } from '@/theme';

/** Les deux formes de groupe à plusieurs. Le solo se choisit à l'écran d'avant. */
const TYPES: { value: GroupType; key: string }[] = [
  { value: 'roommates', key: 'onboarding.colocation' },
  { value: 'association', key: 'onboarding.association' },
];

export default function CreateGroup() {
  const router = useRouter();
  const locale = useLocale();
  const t = useT();
  const toast = useToast();
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
        <Text variant="tagName">{t('onboarding.creerGroupe')}</Text>
        <Text variant="body" color="inkSoft" style={styles.intro}>
          Vous en devenez l&apos;administrateur. Un code d&apos;invitation sera
          généré pour les autres.
        </Text>

        <View style={styles.form}>
          <Field
            label={t('onboarding.nomDuGroupe')}
            value={name}
            onChangeText={setName}
            placeholder={t('onboarding.exempleNom')}
            autoFocus
            maxLength={100}
          />

          <View style={styles.group}>
            <Text variant="monoLabel" color="inkSoft">
              {t('onboarding.type')}
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
                    {t(option.key)}
                  </Text>
                );
              })}
            </View>
          </View>
        </View>

        {create.isError && (
          <Text variant="caption" color="rustClay" style={styles.error}>
            {apiErrorMessage(create.error, locale)}
          </Text>
        )}

        <Button
          label={t('onboarding.creerLeGroupe')}
          onPress={() =>
            create.mutate(
              { name: name.trim(), type },
              {
                onSuccess: (group) => {
                  toast(t('onboarding.groupeCree', { nom: group.name }));
                  router.replace('/');
                },
              },
            )
          }
          disabled={!isValid}
          loading={create.isPending}
          style={styles.submit}
        />

        <View style={[styles.rule, { backgroundColor: colors.thread }]} />
        <SystemFooter left={t('onboarding.statutConfig')} />
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
