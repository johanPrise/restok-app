import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/store/session';
import type { AuthResponse } from '@/types/api';
import { apiRequest } from './client';

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
