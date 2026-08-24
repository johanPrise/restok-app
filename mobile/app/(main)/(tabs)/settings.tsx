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
import { apiErrorMessage } from '@/lib/api-error';
import { useIsSolo } from '@/lib/useIsSolo';
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
  const solo = useIsSolo();

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
        {/* Seul, il n'y a personne à inviter et personne à gérer. Le code
            existe toujours en base — inviter quelqu'un reste possible depuis
            « Ouvrir aux autres » — mais l'afficher en permanence, c'est mettre
            une porte au milieu d'une pièce vide. */}
        {!solo && group.data && (
          <InviteCodeCard
            code={group.data.inviteCode}
            groupName={group.data.name}
          />
        )}

        {!solo && (
          <Members
            members={members.data ?? []}
            selfId={member?.id}
            canManage={isAdmin}
            loading={members.isPending}
          />
        )}

        {solo && group.data && <OpenToOthers code={group.data.inviteCode} />}

        {isAdmin && group.data && (
          <DeleteGroup group={group.data} solo={solo} />
        )}

        <View style={styles.footer}>
          {!solo && <LeaveGroup />}

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

/**
 * La porte de sortie du mode solo, repliée.
 *
 * On ne supprime pas la possibilité d'inviter, on cesse seulement de la mettre
 * en avant : quelqu'un qui vit seul aujourd'hui peut prendre un colocataire
 * demain, et il doit trouver comment. Le code apparaît quand il le demande —
 * et le groupe cesse d'être solo dès que quelqu'un s'en sert.
 */
function OpenToOthers({ code }: Readonly<{ code: string }>) {
  const [shown, setShown] = useState(false);
  const group = useGroup();

  if (!shown) {
    return (
      <Button
        variant="secondary"
        label="Ouvrir aux autres"
        onPress={() => setShown(true)}
      />
    );
  }

  return <InviteCodeCard code={code} groupName={group.data?.name ?? ''} />;
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
          {apiErrorMessage(setRole.error ?? remove.error)}
        </Text>
      )}
    </View>
  );
}

/**
 * Suppression du groupe. Le §5 demande de **retaper le nom** : c'est
 * irréversible pour tout le monde, pas seulement pour celui qui appuie.
 */
function DeleteGroup({
  group,
  solo,
}: Readonly<{ group: GroupDetail; solo: boolean }>) {
  const [arming, setArming] = useState(false);
  const [typed, setTyped] = useState('');
  const remove = useDeleteGroup();
  const toast = useToast();

  const matches =
    typed.trim().toLowerCase() === group.name.trim().toLowerCase();

  if (!arming) {
    return (
      <Button
        // Seul, on n'a pas de « groupe » : on a son étagère. Employer le mot
        // du partage devant quelqu'un qui ne partage rien, c'est lui parler
        // d'une chose qu'il n'a pas.
        label={solo ? 'Supprimer mon inventaire' : 'Supprimer le groupe'}
        variant="secondary"
        onPress={() => setArming(true)}
        style={styles.section}
      />
    );
  }

  return (
    <View style={styles.section}>
      <Text variant="caption" color="inkSoft">
        {solo
          ? 'Ton étagère, tes courses et tes recettes partent avec. Retape '
          : `L’étagère et les ${group.memberCount} membres partent avec. Retape `}
        <Text variant="bodyStrong">{group.name}</Text> pour confirmer.
      </Text>

      {/* Pas de `placeholder` avec le nom : mettre la réponse dans la case
          annule ce que retaper le nom cherchait à obtenir — un geste délibéré.
          Et le champ semblait déjà rempli pendant que « Supprimer » restait
          gris, sans que rien n'explique pourquoi. La phrase juste au-dessus
          nomme déjà le groupe. */}
      <Field
        label={solo ? 'Nom de ton inventaire' : 'Nom du groupe'}
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {remove.isError && (
        <Text variant="caption" color="rustClay">
          {apiErrorMessage(remove.error)}
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
          {apiErrorMessage(leave.error)}
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
