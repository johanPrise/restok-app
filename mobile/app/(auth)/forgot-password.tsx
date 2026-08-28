import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useForgotPassword } from '@/api/auth';
import { BackLink } from '@/components/BackLink';
import { Button } from '@/components/Button';
import { INVITE_CODE_LENGTH } from '@/components/CodeInput';
import { Field } from '@/components/Field';
import { FormScreen } from '@/components/FormScreen';
import { TagCard } from '@/components/TagCard';
import { Text } from '@/components/Text';
import { useLocale, useT } from '@/i18n/useT';
import { apiErrorMessage } from '@/lib/api-error';
import { useGoBack } from '@/lib/useGoBack';
import { spacing } from '@/theme';

/**
 * Retrouver son compte, premier temps.
 *
 * C'était le trou le plus grave du projet : l'email est l'identifiant de
 * connexion, et le changer exige justement le mot de passe. Quelqu'un qui
 * l'oubliait était enfermé dehors définitivement.
 *
 * L'écran ne dit jamais « c'est envoyé ». Le serveur répond la même chose que
 * le compte existe ou non — sans quoi n'importe qui saurait qui en a un — et
 * l'écran ne doit pas trahir ici ce que la route se refuse à dire.
 */
export default function ForgotPassword() {
  const router = useRouter();
  const goBack = useGoBack('/login');
  const locale = useLocale();
  const t = useT();
  const [email, setEmail] = useState('');
  const forgot = useForgotPassword();

  const isValid = email.includes('@');

  const submit = () =>
    forgot.mutate(email.trim().toLowerCase(), {
      // L'email voyage jusqu'à l'écran suivant : le code seul ne suffit pas à
      // retrouver la demande, et personne n'a à le retaper.
      onSuccess: () =>
        router.push({
          pathname: '/reset-password',
          params: { email: email.trim().toLowerCase() },
        }),
    });

  return (
    <FormScreen>
      <BackLink onPress={goBack} />

      <TagCard>
        <Text variant="tagName">{t('acces.oubliTitre')}</Text>
        <Text variant="body" color="inkSoft" style={styles.intro}>
          {t('acces.oubliQuoi', { count: INVITE_CODE_LENGTH })}
        </Text>

        <View style={styles.form}>
          <Field
            label={t('acces.email')}
            value={email}
            onChangeText={setEmail}
            placeholder={t('acces.exempleEmail')}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            autoFocus
            onSubmitEditing={() => isValid && submit()}
            returnKeyType="send"
          />
        </View>

        {forgot.isError && (
          <Text variant="caption" color="rustClay" style={styles.error}>
            {apiErrorMessage(forgot.error, locale)}
          </Text>
        )}

        <Button
          label={t('acces.envoyerLeCode')}
          onPress={submit}
          disabled={!isValid}
          loading={forgot.isPending}
          style={styles.submit}
        />
      </TagCard>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: spacing.sm },
  form: { gap: spacing.md, marginTop: spacing.md },
  error: { marginTop: spacing.sm },
  submit: { marginTop: spacing.md },
});
