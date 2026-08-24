import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRegister } from '@/api/auth';
import { BackLink } from '@/components/BackLink';
import { useGoBack } from '@/lib/useGoBack';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { FormScreen } from '@/components/FormScreen';
import { SystemFooter } from '@/components/SystemFooter';
import { TagCard } from '@/components/TagCard';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { border, spacing, useTheme } from '@/theme';

/** Aligné sur RegisterDto côté backend, pour ne pas dépendre d'un aller-retour. */
const MIN_NAME_LENGTH = 2;
const MIN_PASSWORD_LENGTH = 8;

export default function Register() {
  const router = useRouter();
  const toast = useToast();
  const goBack = useGoBack('/login');
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const register = useRegister();

  const submit = () =>
    register.mutate(
      { name: name.trim(), email, password },
      // Même raison qu'à la connexion : l'aiguillage racine ne se traverse pas
      // depuis ici.
      {
        onSuccess: (auth) => {
          toast(`Compte créé — bienvenue, ${auth.member.name}`);
          router.replace('/');
        },
      },
    );

  const passwordTooShort =
    password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const isValid =
    name.trim().length >= MIN_NAME_LENGTH &&
    email.includes('@') &&
    password.length >= MIN_PASSWORD_LENGTH;

  return (
    <FormScreen>
      <BackLink onPress={goBack} />

      <TagCard>
        <Text variant="tagName">Créer un compte</Text>
        <Text variant="body" color="inkSoft" style={styles.intro}>
          {/* Trois portes suivent, pas deux : annoncer un groupe à qui vient
              ouvrir un inventaire pour lui seul, c'est lui dire que sa porte
              n'existe pas. */}
          Vous choisirez juste après : un groupe à créer, un à rejoindre, ou
          votre inventaire à vous.
        </Text>

        <View style={styles.form}>
          <Field
            label="Nom"
            value={name}
            onChangeText={setName}
            placeholder="Sam"
            autoComplete="name"
            maxLength={100}
          />
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
            autoComplete="new-password"
            // Annoncer la règle avant l'envoi plutôt que de laisser le
            // serveur la refuser.
            error={
              passwordTooShort
                ? `${MIN_PASSWORD_LENGTH} caractères minimum`
                : undefined
            }
          />
        </View>

        {register.isError && (
          <Text variant="caption" color="rustClay" style={styles.error}>
            {register.error.message}
          </Text>
        )}

        <Button
          label="Créer le compte"
          onPress={submit}
          disabled={!isValid}
          loading={register.isPending}
          style={styles.submit}
        />

        <View style={[styles.rule, { backgroundColor: colors.thread }]} />
        <SystemFooter left="Statut: création_compte" />
      </TagCard>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: spacing.sm },
  form: { gap: spacing.md, marginTop: spacing.md },
  error: { marginTop: spacing.sm },
  submit: { marginTop: spacing.md },
  rule: { height: border.hairline, marginTop: spacing.md },
});
