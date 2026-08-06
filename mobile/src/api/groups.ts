import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/store/session';
import type { Group, GroupDetail, GroupType, MemberSummary } from '@/types/api';
import { authedRequest } from './authed';
import { queryKeys } from './query-client';

export function useGroup() {
  const groupId = useSession((s) => s.member?.groupId);

  return useQuery({
    queryKey: queryKeys.group,
    queryFn: () => authedRequest<GroupDetail>('/groups/me'),
    // Les routes « membre » renvoient 403 sans groupe : inutile de demander.
    enabled: Boolean(groupId),
  });
}

export function useMembers() {
  const groupId = useSession((s) => s.member?.groupId);

  return useQuery({
    queryKey: queryKeys.members,
    queryFn: () => authedRequest<MemberSummary[]>('/members'),
    enabled: Boolean(groupId),
  });
}

/**
 * Après création ou jointure, `groupId` et `role` du membre changent. Le token
 * reste valable — les droits sont relus en base à chaque requête — mais la
 * session locale doit refléter la nouvelle appartenance, sinon les écrans
 * continuent de croire que l'utilisateur n'a pas de groupe.
 */
function useJoinedGroup() {
  const queryClient = useQueryClient();

  return (group: Group, role: 'admin' | 'member') => {
    // getState() au moment de l'appel, pas au rendu : sinon `member` est figé
    // dans une closure créée avant la connexion.
    const { member, setMember } = useSession.getState();
    if (member) void setMember({ ...member, groupId: group.id, role });
    void queryClient.invalidateQueries();
  };
}

export function useCreateGroup() {
  const onJoined = useJoinedGroup();

  return useMutation({
    mutationFn: (input: { name: string; type?: GroupType }) =>
      authedRequest<Group>('/groups', { method: 'POST', body: input }),
    onSuccess: (group) => onJoined(group, 'admin'),
  });
}

export function useJoinGroup() {
  const onJoined = useJoinedGroup();

  return useMutation({
    mutationFn: (inviteCode: string) =>
      authedRequest<Group>('/groups/join', {
        method: 'POST',
        body: { inviteCode },
      }),
    onSuccess: (group) => onJoined(group, 'member'),
  });
}

export function useRenameGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      authedRequest<Group>('/groups/me', { method: 'PATCH', body: { name } }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.group }),
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authedRequest<void>('/groups/me', { method: 'DELETE' }),
    onSuccess: () => {
      // Le backend détache tous les membres, y compris l'admin.
      const { member, setMember } = useSession.getState();
      if (member) void setMember({ ...member, groupId: null, role: 'member' });
      queryClient.clear();
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) =>
      authedRequest<void>(`/members/${memberId}`, { method: 'DELETE' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.members }),
  });
}

export function useRegisterPushToken() {
  return useMutation({
    mutationFn: (pushToken: string) =>
      authedRequest<void>('/members/me/push-token', {
        method: 'PATCH',
        body: { pushToken },
      }),
  });
}
