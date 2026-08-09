import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useUpdateProfile } from '@/api/auth';
import { BackLink } from '@/components/BackLink';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { FormScreen } from '@/components/FormScreen';
import { Text } from '@/components/Text';
import { useGoBack } from '@/lib/useGoBack';
import { useSession } from '@/store/session';
import { spacing } from '@/theme';

/** Alignés sur UpdateProfileDto côté backend. */
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;

/**
 * Son propre compte : le nom qui apparaît sous chaque action, et l'email qui
 * sert à se connecter.
 *
 * Séparé des réglages du groupe, qui parlent du collectif. La maquette leur
 * réservait un onglet « Profil » que la barre à quatre onglets n'a pas — on y
 * arrive donc depuis Paramètres.
 */
export default function Account() {
  const goBack = useGoBack('/settings');
  const member = useSession((s) => s.member);
  const update = useUpdateProfile();

  const [name, setName] = useState(member?.name ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);

  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();

  // L'email est l'identifiant de connexion : le changer demande de confirmer
  // son mot de passe. Le nom, lui, ne donne accès à rien.
  const emailChanged = trimmedEmail !== member?.email;
  const errors = validate(trimmedName, trimmedEmail, emailChanged, password);
  const shown = submitted ? errors : {};

  const changed =
    trimmedName !== member?.name || trimmedEmail !== member?.email;

  const submit = () => {
    setSubmitted(true);
    setSaved(false);
    if (errors.name || errors.email || errors.password) return;

    // On n'envoie que ce qui bouge : changer d'email est le seul geste qui
    // touche à l'identifiant de connexion, autant ne pas le faire pour rien.
    update.mutate(
      {
        ...(trimmedName === member?.name ? {} : { name: trimmedName }),
        ...(emailChanged
          ? { email: trimmedEmail, currentPassword: password }
          : {}),
      },
      {
        onSuccess: () => {
          setSaved(true);
          setPassword('');
        },
      },
    );
  };

  return (
    <FormScreen>
      <BackLink onPress={goBack} />

      <View style={styles.header}>
        <Text variant="title">Mon compte</Text>
        <Text variant="monoLabel" color="inkSoft">
          Profil / Identité
        </Text>
      </View>

      <View style={styles.form}>
        <Field
          label="Nom"
          value={name}
          onChangeText={(next) => {
            setName(next);
            setSaved(false);
          }}
          placeholder="Comment on t'appelle"
          error={shown.name}
          autoCapitalize="words"
          autoComplete="name"
        />
        <Field
          label="Email"
          value={email}
          onChangeText={(next) => {
            setEmail(next);
            setSaved(false);
          }}
          placeholder="vous@exemple.fr"
          error={shown.email}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
        />
        {/* N'apparaît qu'au moment où il sert : changer son seul nom ne
            demande rien. */}
        {emailChanged && (
          <Field
            label="Ton mot de passe"
            value={password}
            onChangeText={setPassword}
            placeholder="Pour confirmer le changement d'email"
            error={shown.password}
            secureTextEntry
            autoComplete="current-password"
          />
        )}

        <Text variant="caption" color="inkSoft">
          Ton nom s&apos;affiche sous chaque prise et chaque rachat. Ton email
          sert à te connecter — le changer demande ton mot de passe.
        </Text>
      </View>

      {update.isError && (
        <Text variant="caption" color="rustClay" style={styles.feedback}>
          {update.error.message}
        </Text>
      )}

      {saved && !update.isError && (
        <Text variant="caption" color="sage" style={styles.feedback}>
          Enregistré.
        </Text>
      )}

      <Button
        label="Enregistrer"
        onPress={submit}
        disabled={!changed}
        loading={update.isPending}
        style={styles.submit}
      />
    </FormScreen>
  );
}

interface Errors {
  name?: string;
  email?: string;
  password?: string;
}

/** Reprend les contraintes du DTO ; le serveur reste seul juge. */
function validate(
  name: string,
  email: string,
  emailChanged: boolean,
  password: string,
): Errors {
  const errors: Errors = {};

  if (name.length < MIN_NAME_LENGTH) errors.name = 'Au moins deux caractères.';
  else if (name.length > MAX_NAME_LENGTH) {
    errors.name = 'Cent caractères au maximum.';
  }

  if (!email.includes('@')) errors.email = 'Adresse email invalide.';
  if (emailChanged && password.length === 0) {
    errors.password = 'Confirme ton mot de passe.';
  }

  return errors;
}

const styles = StyleSheet.create({
  header: { gap: 2, marginBottom: spacing.lg },
  form: { gap: spacing.md },
  feedback: { marginTop: spacing.sm },
  submit: { marginTop: spacing.lg },
});
