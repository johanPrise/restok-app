import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/store/session';
import type { AuthResponse, MemberSummary } from '@/types/api';
import { authedRequest } from './authed';
import { apiRequest } from './client';
import { purgePersistedCache } from './persist';
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
 * Demande un code de réinitialisation.
 *
 * Le serveur répond 204 que le compte existe ou non — répondre « adresse
 * inconnue » ferait de cette route un annuaire. L'écran dit donc « si un
 * compte existe », et non « c'est envoyé ».
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      apiRequest<void>('/auth/forgot-password', {
        method: 'POST',
        body: { email },
      }),
  });
}

/**
 * Pose le nouveau mot de passe, et ouvre la session dans la foulée.
 *
 * Renvoyer au formulaire de connexion ferait retaper à l'instant même le mot
 * de passe qu'on vient de choisir, sur l'écran dont on sortait justement faute
 * de savoir le remplir.
 */
export function useResetPassword() {
  const signIn = useSession((s) => s.signIn);

  return useMutation({
    mutationFn: (input: { email: string; code: string; password: string }) =>
      apiRequest<AuthResponse>('/auth/reset-password', {
        method: 'POST',
        body: input,
      }),
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
    // précédent — et depuis que le cache va sur disque, il la reverrait même
    // après un redémarrage.
    queryClient.clear();
    purgePersistedCache();
  };
}
