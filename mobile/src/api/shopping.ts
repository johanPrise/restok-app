import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/store/session';
import type { AddShoppingLineInput, ShoppingLine } from '@/types/api';
import { authedRequest } from './authed';
import { mutationKeys } from './mutation-keys';
import { queryKeys } from './query-client';

export function useShoppingList() {
  const groupId = useSession((s) => s.member?.groupId);

  return useQuery({
    queryKey: queryKeys.shopping,
    queryFn: () => authedRequest<ShoppingLine[]>('/shopping'),
    enabled: Boolean(groupId),
  });
}

/**
 * Les quatre gestes de ligne ne portent qu'une clé : leur définition vit dans
 * `query-client`, hors de tout composant, pour qu'une mutation mise en pause
 * hors-ligne puisse repartir après un redémarrage — un composant démonté ne
 * peut plus fournir sa fonction.
 */
// Les paramètres de type sont répétés ici : `useMutation` ne va pas les lire
// dans les défauts, et sans eux les appelants passeraient n'importe quoi.
export function useAddShoppingLine() {
  return useMutation<ShoppingLine, Error, AddShoppingLineInput>({
    mutationKey: mutationKeys.addShoppingLine,
  });
}

export function useToggleShoppingLine() {
  return useMutation<ShoppingLine, Error, { id: string; checked: boolean }>({
    mutationKey: mutationKeys.toggleShoppingLine,
  });
}

export function useSetShoppingLineQuantity() {
  return useMutation<ShoppingLine, Error, { id: string; quantity: number }>({
    mutationKey: mutationKeys.setShoppingLineQuantity,
  });
}

export function useRemoveShoppingLine() {
  return useMutation<void, Error, string>({
    mutationKey: mutationKeys.removeShoppingLine,
  });
}

/**
 * Verse dans la liste ce que l'étagère réclame.
 *
 * Sans clé, donc jamais reprise après coup : elle calcule ce qui manque **au
 * moment de l'appel**. Différée d'une heure, elle verserait un état qui n'est
 * plus le bon. `networkMode: 'always'` pour qu'elle échoue franchement hors
 * réseau au lieu d'attendre en silence.
 */
export function useRefillShopping() {
  const queryClient = useQueryClient();

  return useMutation({
    networkMode: 'always',
    mutationFn: () =>
      authedRequest<ShoppingLine[]>('/shopping/refill', { method: 'POST' }),
    onSuccess: (lines) => queryClient.setQueryData(queryKeys.shopping, lines),
  });
}

/**
 * Les lignes cochées deviennent des rachats.
 *
 * **Jamais** mise en file. C'est une incrémentation qui écrit dans le stock et
 * dans le journal : rejouée après coup, elle double l'inventaire, et le journal
 * jure que c'est vrai. L'écran la refuse hors-ligne, et l'absence de clé
 * garantit qu'aucune reprise automatique ne la ressuscitera.
 */
export function useCompleteShopping() {
  const queryClient = useQueryClient();

  return useMutation({
    networkMode: 'always',
    mutationFn: () =>
      authedRequest<ShoppingLine[]>('/shopping/complete', { method: 'POST' }),
    onSuccess: (lines) => {
      queryClient.setQueryData(queryKeys.shopping, lines);
      // L'étagère change aussi, et c'est tout l'intérêt.
      void queryClient.invalidateQueries({ queryKey: queryKeys.items });
    },
  });
}
