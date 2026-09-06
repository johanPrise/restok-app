import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLogin } from '@/api/auth';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { FormScreen } from '@/components/FormScreen';
import { SystemFooter } from '@/components/SystemFooter';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { useLocale, useT } from '@/i18n/useT';
import { apiErrorMessage } from '@/lib/api-error';
import { border, MIN_TOUCH_TARGET, spacing, useTheme } from '@/theme';

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
        <Text variant="dataLabel" color="inkSoft">
          {t('acces.statutEtape')}
        </Text>
      </View>

      <Card>
        <Text variant="title">{t('acces.seConnecter')}</Text>

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
          <Text variant="caption" color="out" style={styles.error}>
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

        {/* Sous les deux boutons et non entre eux : c'est la porte de secours,
            elle ne doit pas se disputer la place avec le geste ordinaire. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/forgot-password')}
          hitSlop={spacing.tight}
          style={styles.forgot}
        >
          <Text variant="dataLabel" color="accent">
            {t('acces.motDePasseOublie')}
          </Text>
        </Pressable>

        <View style={[styles.rule, { backgroundColor: colors.rule }]} />
        <SystemFooter left={t('acces.statutIdentifiants')} />
      </Card>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.group, gap: spacing.tight },
  form: { gap: spacing.base, marginTop: spacing.base },
  error: { marginTop: spacing.tight },
  submit: { marginTop: spacing.base },
  secondary: { marginTop: spacing.tight },
  forgot: {
    marginTop: spacing.base,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rule: { height: border.hairline, marginTop: spacing.base },
});
