import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDeleteAccount, useUpdateProfile } from '@/api/auth';
import { useMembers } from '@/api/groups';
import { BackLink } from '@/components/BackLink';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { FormScreen } from '@/components/FormScreen';
import { Text } from '@/components/Text';
import { useLocale, useT } from '@/i18n/useT';
import { deletionConsequences } from '@/lib/account-deletion';
import { apiErrorMessage } from '@/lib/api-error';
import { useGoBack } from '@/lib/useGoBack';
import { useIsSolo } from '@/lib/useIsSolo';
import { useSession } from '@/store/session';
import { border, spacing, useTheme } from '@/theme';

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
  const locale = useLocale();
  const t = useT();
  const { colors } = useTheme();
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
  const errors = validate(t, trimmedName, trimmedEmail, emailChanged, password);
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
        <Text variant="title">{t('compte.titre')}</Text>
        <Text variant="dataLabel" color="inkSoft">
          {t('compte.sousTitre')}
        </Text>
      </View>

      <View style={styles.form}>
        <Field
          label={t('compte.nom')}
          value={name}
          onChangeText={(next) => {
            setName(next);
            setSaved(false);
          }}
          placeholder={t('compte.exempleNom')}
          error={shown.name}
          autoCapitalize="words"
          autoComplete="name"
        />
        <Field
          label={t('compte.email')}
          value={email}
          onChangeText={(next) => {
            setEmail(next);
            setSaved(false);
          }}
          placeholder={t('compte.exempleEmail')}
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
            label={t('compte.tonMotDePasse')}
            value={password}
            onChangeText={setPassword}
            placeholder={t('compte.pourConfirmer')}
            error={shown.password}
            secureTextEntry
            autoComplete="current-password"
          />
        )}

        <Text variant="caption" color="inkSoft">
          {t('compte.explication')}
        </Text>
      </View>

      {update.isError && (
        <Text variant="caption" color="out" style={styles.feedback}>
          {apiErrorMessage(update.error, locale)}
        </Text>
      )}

      {saved && !update.isError && (
        <Text variant="caption" color="ok" style={styles.feedback}>
          {t('commun.enregistre')}
        </Text>
      )}

      <Button
        label={t('commun.enregistrer')}
        onPress={submit}
        disabled={!changed}
        loading={update.isPending}
        style={styles.submit}
      />

      <View style={[styles.danger, { borderTopColor: colors.rule }]}>
        <DeleteAccount />
      </View>
    </FormScreen>
  );
}

/**
 * Supprimer son compte, en deux temps.
 *
 * Les deux stores l'exigent d'une app qui permet d'en créer un, et c'est de
 * toute façon la seule réponse acceptable à quelqu'un qui veut s'en aller.
 *
 * Le mot de passe n'est pas redemandé — il l'est pour changer d'email, parce
 * qu'un email volé sert à prendre le compte ; ici, celui qui appuie ne prend
 * rien à personne. Ce qui compte est de dire **ce qui va se passer** avant, et
 * pas seulement que c'est irréversible : ce qu'il advient du registre que les
 * autres lisent, et de qui reprend les clés.
 */
function DeleteAccount() {
  const locale = useLocale();
  const t = useT();
  const solo = useIsSolo();
  const member = useSession((s) => s.member);
  const { data: members } = useMembers();
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteAccount();

  if (!confirming) {
    return (
      <Button
        label={t('compte.supprimer')}
        variant="secondary"
        onPress={() => setConfirming(true)}
      />
    );
  }

  // Ce que ce départ emporte : le groupe, ou les clés dans les mains de
  // quelqu'un qui ne l'a pas demandé. Les deux phrases ne s'affichent que
  // quand elles sont vraies — sinon elles deviennent un décor.
  const { alone, lastAdmin } = deletionConsequences(member, members);

  return (
    <View style={styles.confirm}>
      <Text variant="caption" color="inkSoft">
        {t('compte.suppressionQuoi')}
      </Text>

      {alone && (
        <Text variant="caption" color="inkSoft">
          {/* Seul, on n'a pas de « groupe » : on a son étagère. Employer le mot
              du partage devant quelqu'un qui ne partage rien, c'est lui parler
              d'une chose qu'il n'a pas. */}
          {t(solo ? 'compte.suppressionSeul' : 'compte.suppressionSeulGroupe')}
        </Text>
      )}

      {lastAdmin && (
        <Text variant="caption" color="inkSoft">
          {t('compte.suppressionSuccession')}
        </Text>
      )}

      {remove.isError && (
        <Text variant="caption" color="out">
          {apiErrorMessage(remove.error, locale)}
        </Text>
      )}

      <View style={styles.actions}>
        <Button
          label={t('commun.annuler')}
          variant="secondary"
          onPress={() => setConfirming(false)}
          style={styles.action}
        />
        <Button
          label={t('compte.supprimeDefinitivement')}
          variant="danger"
          loading={remove.isPending}
          // Pas de `toast` au succès : l'écran disparaît avec la session, et le
          // message serait posé sur une app qui retourne à la connexion.
          onPress={() => remove.mutate()}
          style={styles.action}
        />
      </View>
    </View>
  );
}

interface Errors {
  name?: string;
  email?: string;
  password?: string;
}

/** Reprend les contraintes du DTO ; le serveur reste seul juge. */
function validate(
  t: (key: string) => string,
  name: string,
  email: string,
  emailChanged: boolean,
  password: string,
): Errors {
  const errors: Errors = {};

  if (name.length < MIN_NAME_LENGTH) {
    errors.name = t('champs.deuxCaracteres');
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = t('champs.centCaracteresMax');
  }

  if (!email.includes('@')) errors.email = t('champs.emailInvalide');
  if (emailChanged && password.length === 0) {
    errors.password = t('champs.confirmeMotDePasse');
  }

  return errors;
}

const styles = StyleSheet.create({
  header: { gap: spacing.hair, marginBottom: spacing.card },
  form: { gap: spacing.base },
  feedback: { marginTop: spacing.tight },
  submit: { marginTop: spacing.card },
  // Séparé du formulaire par un trait : ce qui suit ne s'enregistre pas, il
  // s'exécute. Les deux boutons ne doivent pas se ressembler de loin.
  danger: {
    marginTop: spacing.group,
    paddingTop: spacing.card,
    borderTopWidth: border.hairline,
  },
  confirm: { gap: spacing.tight },
  actions: { flexDirection: 'row', gap: spacing.tight },
  action: { flex: 1 },
});
