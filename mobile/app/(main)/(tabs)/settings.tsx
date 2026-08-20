import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSignOut } from '@/api/auth';
import {
  useDeleteGroup,
  useGroup,
  useLeaveGroup,
  useMembers,
  useRemoveMember,
  useSetMemberRole,
} from '@/api/groups';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { InviteCodeCard } from '@/components/InviteCodeCard';
import { MemberRow } from '@/components/MemberRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { useSession } from '@/store/session';
import { MIN_TOUCH_TARGET, spacing } from '@/theme';
import type { GroupDetail, MemberSummary } from '@/types/api';

/**
 * Réglages du groupe (§5).
 *
 * L'ordre suit la maquette : le code d'invitation en haut, traité comme un
 * objet typographique ; les membres ; les actions sensibles regroupées en bas.
 *
 * Le compte et la déconnexion s'y ajoutent : la maquette leur réservait un
 * onglet « Profil » que la barre à quatre onglets retenue n'a pas.
 */
export default function Settings() {
  const member = useSession((s) => s.member);
  const group = useGroup();
  const members = useMembers();
  const signOut = useSignOut();
  const toast = useToast();
  const router = useRouter();
  const isAdmin = member?.role === 'admin';

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Text variant="title">Paramètres</Text>
        <Text variant="monoLabel" color="inkSoft" numberOfLines={1}>
          {group.data?.name ?? ' '}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          // La barre d'onglets est ancrée, pas en survol : `TabSlot` s'arrête
          // déjà au-dessus d'elle, il reste juste un peu d'air en bas de liste.
          { paddingBottom: spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {group.data && (
          <InviteCodeCard
            code={group.data.inviteCode}
            groupName={group.data.name}
          />
        )}

        <Members
          members={members.data ?? []}
          selfId={member?.id}
          canManage={isAdmin}
          loading={members.isPending}
        />

        {isAdmin && group.data && <DeleteGroup group={group.data} />}

        <View style={styles.footer}>
          <LeaveGroup />

          <View style={styles.account}>
            <Text variant="monoLabel" color="inkSoft">
              Compte
            </Text>
            <Text variant="bodyStrong">{member?.name ?? '—'}</Text>
            <Text variant="mono" color="inkSoft">
              {member?.email ?? ''}
            </Text>
          </View>

          <Button
            label="Modifier mon compte"
            variant="secondary"
            onPress={() => router.push('/account')}
          />
          <Button
            label="Se déconnecter"
            variant="secondary"
            onPress={() => {
              void signOut();
              toast('Tu es déconnecté');
            }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Members({
  members,
  selfId,
  canManage,
  loading,
}: Readonly<{
  members: MemberSummary[];
  selfId?: string;
  canManage: boolean;
  loading: boolean;
}>) {
  const [managing, setManaging] = useState(false);
  const setRole = useSetMemberRole();
  const remove = useRemoveMember();
  const toast = useToast();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text variant="monoLabel" color="inkSoft">
          Membres{' '}
          {loading ? '' : `[${String(members.length).padStart(2, '0')}]`}
        </Text>
        {canManage && members.length > 1 && (
          <Button
            label={managing ? 'Terminer' : 'Gérer'}
            variant="secondary"
            onPress={() => setManaging((on) => !on)}
            style={styles.manage}
          />
        )}
      </View>

      {members.map((entry) => (
        <MemberRow
          key={entry.id}
          member={entry}
          isSelf={entry.id === selfId}
          managing={managing}
          onToggleRole={() => {
            const role = entry.role === 'admin' ? 'member' : 'admin';
            setRole.mutate(
              { memberId: entry.id, role },
              {
                onSuccess: () =>
                  toast(
                    role === 'admin'
                      ? `${entry.name} est admin`
                      : `${entry.name} n’est plus admin`,
                  ),
              },
            );
          }}
          onRemove={() =>
            remove.mutate(entry.id, {
              onSuccess: () => toast(`${entry.name} retiré du groupe`),
            })
          }
        />
      ))}

      {(setRole.isError || remove.isError) && (
        <Text variant="caption" color="rustClay">
          {(setRole.error ?? remove.error)?.message}
        </Text>
      )}
    </View>
  );
}

/**
 * Suppression du groupe. Le §5 demande de **retaper le nom** : c'est
 * irréversible pour tout le monde, pas seulement pour celui qui appuie.
 */
function DeleteGroup({ group }: Readonly<{ group: GroupDetail }>) {
  const [arming, setArming] = useState(false);
  const [typed, setTyped] = useState('');
  const remove = useDeleteGroup();
  const toast = useToast();

  const matches =
    typed.trim().toLowerCase() === group.name.trim().toLowerCase();

  if (!arming) {
    return (
      <Button
        label="Supprimer le groupe"
        variant="secondary"
        onPress={() => setArming(true)}
        style={styles.section}
      />
    );
  }

  return (
    <View style={styles.section}>
      <Text variant="caption" color="inkSoft">
        L&apos;étagère et les {group.memberCount} membres partent avec. Retape{' '}
        <Text variant="bodyStrong">{group.name}</Text> pour confirmer.
      </Text>

      <Field
        label="Nom du groupe"
        value={typed}
        onChangeText={setTyped}
        placeholder={group.name}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {remove.isError && (
        <Text variant="caption" color="rustClay">
          {remove.error.message}
        </Text>
      )}

      <View style={styles.actions}>
        <Button
          label="Annuler"
          variant="secondary"
          onPress={() => {
            setArming(false);
            setTyped('');
          }}
          style={styles.action}
        />
        <Button
          label="Supprimer"
          variant="danger"
          disabled={!matches}
          loading={remove.isPending}
          onPress={() =>
            remove.mutate(undefined, {
              onSuccess: () => toast(`Groupe « ${group.name} » supprimé`),
            })
          }
          style={styles.action}
        />
      </View>
    </View>
  );
}

/**
 * Quitter le groupe, en deux temps.
 *
 * Le backend retient le dernier admin qui laisserait du monde derrière lui ; on
 * affiche son message tel quel plutôt que d'en réécrire un approximatif.
 */
function LeaveGroup() {
  const [confirming, setConfirming] = useState(false);
  const leave = useLeaveGroup();
  const toast = useToast();

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
          onPress={() =>
            leave.mutate(undefined, {
              onSuccess: () => toast('Tu as quitté le groupe'),
            })
          }
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.sm, gap: 2 },
  content: { paddingTop: spacing.md, gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MIN_TOUCH_TARGET,
  },
  manage: { paddingHorizontal: spacing.sm },
  footer: { gap: spacing.sm, paddingTop: spacing.md },
  account: { gap: 2 },
  confirm: { gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.xs },
  action: { flex: 1 },
});
