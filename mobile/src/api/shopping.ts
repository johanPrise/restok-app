import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/store/session';
import type { AddShoppingLineInput, ShoppingLine } from '@/types/api';
import { authedRequest } from './authed';
import { queryKeys } from './query-client';

export function useShoppingList() {
  const groupId = useSession((s) => s.member?.groupId);

  return useQuery({
    queryKey: queryKeys.shopping,
    queryFn: () => authedRequest<ShoppingLine[]>('/shopping'),
    enabled: Boolean(groupId),
  });
}

function useInvalidateShopping() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: queryKeys.shopping });
}

export function useAddShoppingLine() {
  const invalidate = useInvalidateShopping();

  return useMutation({
    mutationFn: (input: AddShoppingLineInput) =>
      authedRequest<ShoppingLine>('/shopping', { method: 'POST', body: input }),
    onSuccess: () => void invalidate(),
  });
}

/**
 * Cocher est le geste du magasin, et le seul qui parte en rafale : il doit
 * répondre au doigt, pas au réseau. La ligne bascule donc dans le cache
 * **avant** l'aller-retour, et revient en arrière si le serveur refuse.
 *
 * `cancelQueries` d'abord : un refetch déjà en vol écraserait la bascule avec
 * l'état d'avant en arrivant après elle.
 */
export function useToggleShoppingLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, checked }: { id: string; checked: boolean }) =>
      authedRequest<ShoppingLine>(`/shopping/${id}`, {
        method: 'PATCH',
        body: { checked },
      }),
    onMutate: async ({ id, checked }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.shopping });
      const previous = queryClient.getQueryData<ShoppingLine[]>(
        queryKeys.shopping,
      );

      queryClient.setQueryData<ShoppingLine[]>(queryKeys.shopping, (lines) =>
        lines?.map((line) => (line.id === id ? { ...line, checked } : line)),
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.shopping, context.previous);
      }
    },
    // Dans les deux cas : c'est le serveur qui dit qui a coché et quand.
    onSettled: () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.shopping }),
  });
}

export function useSetShoppingLineQuantity() {
  const invalidate = useInvalidateShopping();

  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      authedRequest<ShoppingLine>(`/shopping/${id}`, {
        method: 'PATCH',
        body: { quantity },
      }),
    onSuccess: () => void invalidate(),
  });
}

export function useRemoveShoppingLine() {
  const invalidate = useInvalidateShopping();

  return useMutation({
    mutationFn: (id: string) =>
      authedRequest<void>(`/shopping/${id}`, { method: 'DELETE' }),
    onSuccess: () => void invalidate(),
  });
}

/**
 * Verse dans la liste ce que l'étagère réclame. Le serveur renvoie la liste
 * entière : on la pose telle quelle plutôt que de relancer une requête pour
 * lire ce qu'on vient de recevoir.
 */
export function useRefillShopping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      authedRequest<ShoppingLine[]>('/shopping/refill', { method: 'POST' }),
    onSuccess: (lines) => queryClient.setQueryData(queryKeys.shopping, lines),
  });
}

/**
 * Les lignes cochées deviennent des rachats. L'étagère change donc aussi, et
 * c'est même tout l'intérêt : sans cette invalidation, on rentre du magasin et
 * le stock affiche encore la veille.
 */
export function useCompleteShopping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      authedRequest<ShoppingLine[]>('/shopping/complete', { method: 'POST' }),
    onSuccess: (lines) => {
      queryClient.setQueryData(queryKeys.shopping, lines);
      void queryClient.invalidateQueries({ queryKey: queryKeys.items });
    },
  });
}
