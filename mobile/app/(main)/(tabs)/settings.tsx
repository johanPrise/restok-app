import { StyleSheet, View } from 'react-native';
import { useSignOut } from '@/api/auth';
import { useGroup } from '@/api/groups';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useSession } from '@/store/session';
import { spacing } from '@/theme';

/**
 * Réglages — version minimale. L'étape 5.7 y ajoutera la liste des membres,
 * les rôles, le renommage et la sortie de groupe.
 *
 * La déconnexion arrive dès maintenant : jusqu'ici l'app n'en offrait aucune,
 * et la barre d'onglets rend le manque visible.
 */
export default function Settings() {
  const member = useSession((s) => s.member);
  const group = useGroup();
  const signOut = useSignOut();

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Text variant="title">Paramètres</Text>
      </View>

      <View style={styles.body}>
        <Row label="Compte" value={member?.name ?? '—'} hint={member?.email} />
        <Row
          label="Groupe"
          value={group.data?.name ?? '—'}
          hint={
            group.data &&
            `Code d'invitation ${group.data.inviteCode} · ${group.data.memberCount} membre${group.data.memberCount > 1 ? 's' : ''}`
          }
        />
      </View>

      <Button
        label="Se déconnecter"
        variant="secondary"
        onPress={() => void signOut()}
      />
    </Screen>
  );
}

function Row({
  label,
  value,
  hint,
}: Readonly<{ label: string; value: string; hint?: string | false }>) {
  return (
    <View style={styles.row}>
      <Text variant="monoLabel" color="inkSoft">
        {label}
      </Text>
      <Text variant="bodyStrong">{value}</Text>
      {hint ? (
        <Text variant="mono" color="inkSoft">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.sm },
  body: { flex: 1, paddingTop: spacing.lg, gap: spacing.lg },
  row: { gap: 2 },
});
