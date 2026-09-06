import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useJoinGroup } from '@/api/groups';
import { Button } from '@/components/Button';
import { CodeInput, INVITE_CODE_LENGTH } from '@/components/CodeInput';
import { FormScreen } from '@/components/FormScreen';
import { SystemFooter } from '@/components/SystemFooter';
import { TagCard } from '@/components/TagCard';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { BackLink } from '@/components/BackLink';
import { useLocale, useT } from '@/i18n/useT';
import { apiErrorMessage } from '@/lib/api-error';
import { useGoBack } from '@/lib/useGoBack';
import { border, spacing, useTheme } from '@/theme';

export default function Join() {
  const router = useRouter();
  const locale = useLocale();
  const t = useT();
  const toast = useToast();
  const goBack = useGoBack('/choose');
  const { colors } = useTheme();
  const [code, setCode] = useState('');
  const join = useJoinGroup();

  const isComplete = code.length === INVITE_CODE_LENGTH;

  const submit = () => {
    join.mutate(code, {
      // La redirection est portée par l'aiguillage racine une fois le membre
      // rattaché — inutile de nommer la destination ici.
      onSuccess: (group) => {
        toast(`Tu as rejoint « ${group.name} »`);
        router.replace('/');
      },
    });
  };

  return (
    <FormScreen>
      <BackLink onPress={goBack} />

      <TagCard>
        <Text variant="title">{t('onboarding.rejoindreGroupe')}</Text>
        <Text variant="body" color="inkSoft" style={styles.intro}>
          {t('onboarding.codeInvite', { count: INVITE_CODE_LENGTH })}
        </Text>

        <Text variant="dataLabel" color="inkSoft" style={styles.label}>
          {t('onboarding.codeInviteLabel')}
        </Text>
        <CodeInput value={code} onChange={setCode} autoFocus />

        {join.isError && (
          <Text variant="caption" color="out" style={styles.error}>
            {apiErrorMessage(join.error, locale)}
          </Text>
        )}

        <View style={styles.actions}>
          <Button
            label={t('onboarding.rejoindre')}
            onPress={submit}
            disabled={!isComplete}
            loading={join.isPending}
          />
          <Button
            label={t('onboarding.creerNouveau')}
            variant="secondary"
            onPress={() => router.replace('/create-group')}
          />
        </View>

        <View style={[styles.rule, { backgroundColor: colors.rule }]} />
        <SystemFooter
          left={t(
            isComplete ? 'onboarding.statutPret' : 'onboarding.statutAttente',
          )}
          right={`${code.length}/${INVITE_CODE_LENGTH}`}
        />
      </TagCard>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: spacing.tight },
  label: { marginTop: spacing.base, marginBottom: spacing.tight },
  error: { marginTop: spacing.tight },
  actions: { gap: spacing.tight, marginTop: spacing.base },
  rule: { height: border.hairline, marginTop: spacing.base },
});
