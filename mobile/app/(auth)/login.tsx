import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLogin } from '@/api/auth';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { FormScreen } from '@/components/FormScreen';
import { SystemFooter } from '@/components/SystemFooter';
import { TagCard } from '@/components/TagCard';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { useLocale } from '@/i18n/useT';
import { useT } from '@/i18n/useT';
import { apiErrorMessage } from '@/lib/api-error';
import { border, spacing, useTheme } from '@/theme';

export default function Login() {
  const router = useRouter();
  const locale = useLocale();
  const toast = useToast();
  const t = useT();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  const isValid = email.includes('@') && password.length > 0;

  // Établir la session ne déplace personne : l'aiguillage vit dans `app/index`,
  // qu'on ne traverse pas depuis ici. `replace` pour que le retour arrière ne
  // ramène pas sur l'écran de connexion une fois connecté.
  const submit = () =>
    login.mutate(
      { email, password },
      {
        onSuccess: (auth) => {
          toast(t('acces.bienvenue', { nom: auth.member.name }));
          router.replace('/');
        },
      },
    );

  return (
    <FormScreen>
      <View style={styles.header}>
        <Text variant="display">Restock</Text>
        <Text variant="monoLabel" color="inkSoft">
          {t('acces.statutEtape')}
        </Text>
      </View>

      <TagCard>
        <Text variant="tagName">{t('acces.seConnecter')}</Text>

        <View style={styles.form}>
          <Field
            label={t('acces.email')}
            value={email}
            onChangeText={setEmail}
            placeholder={t('acces.exempleEmail')}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
          />
          <Field
            label={t('acces.motDePasse')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            onSubmitEditing={() => isValid && submit()}
            returnKeyType="go"
          />
        </View>

        {login.isError && (
          // Le backend renvoie le même message pour un email inconnu et un
          // mauvais mot de passe — on ne le désambiguïse pas ici non plus.
          <Text variant="caption" color="rustClay" style={styles.error}>
            {apiErrorMessage(login.error, locale)}
          </Text>
        )}

        <Button
          label={t('acces.seConnecter')}
          onPress={submit}
          disabled={!isValid}
          loading={login.isPending}
          style={styles.submit}
        />
        <Button
          label={t('acces.creerUnCompte')}
          variant="secondary"
          onPress={() => router.push('/register')}
          style={styles.secondary}
        />

        <View style={[styles.rule, { backgroundColor: colors.thread }]} />
        <SystemFooter left={t('acces.statutIdentifiants')} />
      </TagCard>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.xl, gap: spacing.xs },
  form: { gap: spacing.md, marginTop: spacing.md },
  error: { marginTop: spacing.sm },
  submit: { marginTop: spacing.md },
  secondary: { marginTop: spacing.sm },
  rule: { height: border.hairline, marginTop: spacing.md },
});
