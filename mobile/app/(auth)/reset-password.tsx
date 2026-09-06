import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useResetPassword } from '@/api/auth';
import { BackLink } from '@/components/BackLink';
import { Button } from '@/components/Button';
import { CodeInput, INVITE_CODE_LENGTH } from '@/components/CodeInput';
import { Field } from '@/components/Field';
import { FormScreen } from '@/components/FormScreen';
import { TagCard } from '@/components/TagCard';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { useLocale, useT } from '@/i18n/useT';
import { apiErrorMessage } from '@/lib/api-error';
import { useGoBack } from '@/lib/useGoBack';
import { spacing } from '@/theme';

/** Aligné sur le DTO du backend, qui reste seul juge. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Retrouver son compte, second temps.
 *
 * Le code se saisit dans le même `CodeInput` que les invitations : c'est le
 * même geste — recopier huit caractères reçus ailleurs — et il a déjà sa
 * forme dans l'app.
 *
 * L'intro dit « si un compte existe », jamais « c'est envoyé » : le serveur
 * répond la même chose dans les deux cas, et l'écran ne doit pas trahir ici ce
 * que la route se refuse à dire.
 *
 * L'email vient de l'écran précédent et n'est pas redemandé. Le serveur en a
 * besoin, lui : il ne stocke du code qu'un hash bcrypt, qu'on ne peut pas
 * interroger, et il faut donc savoir de qui on parle avant de comparer.
 */
export default function ResetPassword() {
  const router = useRouter();
  const goBack = useGoBack('/forgot-password');
  const { email } = useLocalSearchParams<{ email?: string }>();
  const locale = useLocale();
  const t = useT();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const reset = useResetPassword();

  // Arrivé ici sans passer par la demande, on n'a pas de qui parler.
  if (!email) return <Redirect href="/forgot-password" />;

  const isValid =
    code.length === INVITE_CODE_LENGTH &&
    password.length >= MIN_PASSWORD_LENGTH;

  const submit = () =>
    reset.mutate(
      { email, code, password },
      {
        onSuccess: () => {
          toast(t('acces.change'));
          // La session est ouverte : `app/index` aiguille vers l'étagère ou
          // vers l'onboarding selon que le compte a un groupe.
          router.replace('/');
        },
      },
    );

  return (
    <FormScreen>
      <BackLink onPress={goBack} />

      <TagCard>
        <Text variant="title">{t('acces.nouveauTitre')}</Text>
        <Text variant="body" color="inkSoft" style={styles.intro}>
          {t('acces.oubliEnvoye')}
        </Text>

        <Text variant="dataLabel" color="inkSoft" style={styles.label}>
          {t('acces.codeRecu')}
        </Text>
        <CodeInput value={code} onChange={setCode} autoFocus />

        <View style={styles.form}>
          <Field
            label={t('acces.nouveauMotDePasse')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            // Annoncer la règle avant l'envoi, comme à l'inscription, plutôt
            // que de laisser le serveur la refuser.
            error={
              password.length > 0 && password.length < MIN_PASSWORD_LENGTH
                ? t('acces.caracteresMinimum', {
                    count: MIN_PASSWORD_LENGTH,
                  })
                : undefined
            }
            onSubmitEditing={() => isValid && submit()}
            returnKeyType="go"
          />
        </View>

        {reset.isError && (
          <Text variant="caption" color="out" style={styles.error}>
            {apiErrorMessage(reset.error, locale)}
          </Text>
        )}

        <Button
          label={t('acces.valider')}
          onPress={submit}
          disabled={!isValid}
          loading={reset.isPending}
          style={styles.submit}
        />

        {/* Un code qui n'arrive pas est le cas le plus fréquent — boîte pleine,
            adresse mal tapée, courrier indésirable. Sans cette porte, on
            resterait devant un champ qu'on ne peut pas remplir. */}
        <Button
          variant="secondary"
          label={t('acces.renvoyer')}
          onPress={() => router.replace('/forgot-password')}
        />
      </TagCard>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: spacing.tight },
  label: { marginTop: spacing.base, marginBottom: spacing.tight },
  form: { gap: spacing.base, marginTop: spacing.base },
  error: { marginTop: spacing.tight },
  submit: { marginTop: spacing.base, marginBottom: spacing.tight },
});
