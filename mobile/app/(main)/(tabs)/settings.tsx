import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSignOut } from '@/api/auth';
import { useGroup, useLeaveGroup } from '@/api/groups';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useSession } from '@/store/session';
import { spacing } from '@/theme';

/**
 * Réglages — version minimale. L'étape 5.7 y ajoutera la liste des membres,
 * leurs rôles et le renommage du groupe.
 *
 * Déconnexion et sortie de groupe sont là dès maintenant : l'app n'offrait ni
 * l'une ni l'autre, et sans la seconde personne ne pouvait quitter un groupe
 * autrement qu'en se faisant retirer par un admin.
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

      <View style={styles.footer}>
        <LeaveGroup />
        <Button
          label="Se déconnecter"
          variant="secondary"
          onPress={() => void signOut()}
        />
      </View>
    </Screen>
  );
}

/**
 * Quitter le groupe, en deux temps.
 *
 * Le backend retient le dernier admin qui laisserait du monde derrière lui ; on
 * affiche son message tel quel plutôt que d'en réécrire un approximatif. La
 * promotion d'un autre membre, qui débloque ce cas, arrive avec l'étape 5.7.
 */
function LeaveGroup() {
  const [confirming, setConfirming] = useState(false);
  const leave = useLeaveGroup();

  if (!confirming) {
    return (
      <Button
        label="Quitter le groupe"
        variant="secondary"
        onPress={() => setConfirming(true)}
      />
    );
  }

  return (
    <View style={styles.confirm}>
      <Text variant="caption" color="inkSoft">
        Tu perds l&apos;accès à l&apos;étagère. Ton compte reste, et ton passage
        reste inscrit dans l&apos;historique des items.
      </Text>

      {leave.isError && (
        <Text variant="caption" color="rustClay">
          {leave.error.message}
        </Text>
      )}

      <View style={styles.actions}>
        <Button
          label="Annuler"
          variant="secondary"
          onPress={() => setConfirming(false)}
          style={styles.action}
        />
        <Button
          label="Quitter"
          variant="danger"
          loading={leave.isPending}
          onPress={() => leave.mutate()}
          style={styles.action}
        />
      </View>
    </View>
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
  footer: { gap: spacing.xs },
  confirm: { gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.xs },
  action: { flex: 1 },
});
