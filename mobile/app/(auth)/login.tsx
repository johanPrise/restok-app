import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useLogin } from '@/api/auth';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { SystemFooter } from '@/components/SystemFooter';
import { TagCard } from '@/components/TagCard';
import { Text } from '@/components/Text';
import { border, spacing, useTheme } from '@/theme';

export default function Login() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  const isValid = email.includes('@') && password.length > 0;

  // Établir la session ne déplace personne : l'aiguillage vit dans `app/index`,
  // qu'on ne traverse pas depuis ici. `replace` pour que le retour arrière ne
  // ramène pas sur l'écran de connexion une fois connecté.
  const submit = () =>
    login.mutate({ email, password }, { onSuccess: () => router.replace('/') });

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Text variant="display">Restock</Text>
          <Text variant="monoLabel" color="inkSoft">
            Accès / Étape 01
          </Text>
        </View>

        <View style={styles.body}>
          <TagCard>
            <Text variant="tagName">Se connecter</Text>

            <View style={styles.form}>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="vous@exemple.fr"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                inputMode="email"
              />
              <Field
                label="Mot de passe"
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
                {login.error.message}
              </Text>
            )}

            <Button
              label="Se connecter"
              onPress={submit}
              disabled={!isValid}
              loading={login.isPending}
              style={styles.submit}
            />
            <Button
              label="Créer un compte"
              variant="secondary"
              onPress={() => router.push('/register')}
              style={styles.secondary}
            />

            <View style={[styles.rule, { backgroundColor: colors.thread }]} />
            <SystemFooter left="Statut: attente_identifiants" />
          </TagCard>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingTop: spacing.xl, gap: spacing.xs },
  body: { flex: 1, justifyContent: 'center' },
  form: { gap: spacing.md, marginTop: spacing.md },
  error: { marginTop: spacing.sm },
  submit: { marginTop: spacing.md },
  secondary: { marginTop: spacing.sm },
  rule: { height: border.hairline, marginTop: spacing.md },
});
