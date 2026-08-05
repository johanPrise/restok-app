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

export function useTakeItem() {
  const invalidate = useInvalidateItem();

  return useMutation({
    mutationFn: (itemId: string) =>
      authedRequest<Item>(`/items/${itemId}/take`, { method: 'POST' }),
    onSuccess: (item) => invalidate(item.id),
  });
}

export function useRestockItem() {
  const invalidate = useInvalidateItem();

  return useMutation({
    // `quantity` est obligatoire côté backend pour un item suivi en quantité,
    // ignoré en mode binaire.
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity?: number }) =>
      authedRequest<Item>(`/items/${itemId}/restock`, {
        method: 'POST',
        body: quantity === undefined ? {} : { quantity },
      }),
    onSuccess: (item) => invalidate(item.id),
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
