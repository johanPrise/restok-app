import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/store/session';
import type {
  CreateItemInput,
  HistoryEntry,
  Item,
  UpdateItemInput,
} from '@/types/api';
import { authedRequest } from './authed';
import { queryKeys } from './query-client';

export function useItems() {
  const groupId = useSession((s) => s.member?.groupId);

  return useQuery({
    queryKey: queryKeys.items,
    queryFn: () => authedRequest<Item[]>('/items'),
    enabled: Boolean(groupId),
  });
}

export function useItemHistory(itemId: string) {
  return useQuery({
    queryKey: queryKeys.itemHistory(itemId),
    queryFn: () => authedRequest<HistoryEntry[]>(`/items/${itemId}/history`),
  });
}

/** Une action sur un item change la liste *et* son historique. */
function useInvalidateItem() {
  const queryClient = useQueryClient();

  return (itemId: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.items });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.itemHistory(itemId),
    });
  };
}

/**
 * Le rafraîchissement peut attendre : l'animation de décrochage (§4) dure
 * 550ms, alors que le refetch répond en quelques dizaines de millisecondes.
 * Sans ce délai, la liste se réorganise et emporte le tag avant que la
 * séquence ait commencé — le seul moment orchestré de l'app ne se verrait
 * jamais.
 */
function useSettleItem() {
  const invalidate = useInvalidateItem();

  return (itemId: string, delayMs?: number) => {
    if (!delayMs) return invalidate(itemId);
    setTimeout(() => invalidate(itemId), delayMs);
  };
}

export function useTakeItem() {
  const settle = useSettleItem();

  return useMutation({
    mutationFn: ({ itemId }: { itemId: string; settleDelayMs?: number }) =>
      authedRequest<Item>(`/items/${itemId}/take`, { method: 'POST' }),
    onSuccess: (item, { settleDelayMs }) => settle(item.id, settleDelayMs),
  });
}

export function useRestockItem() {
  const settle = useSettleItem();

  return useMutation({
    // `quantity` est obligatoire côté backend pour un item suivi en quantité,
    // ignoré en mode binaire.
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity?: number }) =>
      authedRequest<Item>(`/items/${itemId}/restock`, {
        method: 'POST',
        body: quantity === undefined ? {} : { quantity },
      }),
    onSuccess: (item) => settle(item.id),
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateItemInput) =>
      authedRequest<Item>('/items', { method: 'POST', body: input }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.items }),
  });
}

export function useUpdateItem() {
  const invalidate = useInvalidateItem();

  return useMutation({
    mutationFn: ({ itemId, ...input }: UpdateItemInput & { itemId: string }) =>
      authedRequest<Item>(`/items/${itemId}`, { method: 'PATCH', body: input }),
    onSuccess: (item) => invalidate(item.id),
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) =>
      authedRequest<void>(`/items/${itemId}`, { method: 'DELETE' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.items }),
  });
}
