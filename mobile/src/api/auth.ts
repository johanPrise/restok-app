import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/store/session';
import type { AuthResponse, MemberSummary } from '@/types/api';
import { authedRequest } from './authed';
import { apiRequest } from './client';
import { queryKeys } from './query-client';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

/** Ces deux appels sont publics : pas de token à joindre. */
export function useRegister() {
  const signIn = useSession((s) => s.signIn);

  return useMutation({
    mutationFn: (input: RegisterInput) =>
      apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: input,
      }),
    onSuccess: ({ accessToken, member }) => signIn(accessToken, member),
  });
}

export function useLogin() {
  const signIn = useSession((s) => s.signIn);

  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: input }),
    onSuccess: ({ accessToken, member }) => signIn(accessToken, member),
  });
}

/**
 * Son propre nom et son email.
 *
 * La session locale doit suivre : elle sert de cache d'identité faute
 * d'endpoint « qui suis-je », et l'écran des réglages lit son nom depuis là.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (changes: {
      name?: string;
      email?: string;
      currentPassword?: string;
    }) =>
      authedRequest<MemberSummary>('/members/me', {
        method: 'PATCH',
        body: changes,
      }),
    onSuccess: (updated) => {
      const { member, setMember } = useSession.getState();
      if (member) {
        void setMember({
          ...member,
          name: updated.name,
          email: updated.email,
        });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.members });
    },
  });
}

export function useSignOut() {
  const signOut = useSession((s) => s.signOut);
  const queryClient = useQueryClient();

  return async () => {
    await signOut();
    // Sans ça, le prochain compte connecté verrait un instant l'étagère du
    // précédent.
    queryClient.clear();
  };
}
