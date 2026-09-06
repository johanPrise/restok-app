import type { AddShoppingLineInput, ShoppingLine } from '@/types/api';
import { authedRequest } from './authed';
import { mutationKeys } from './mutation-keys';
import { queryClient, queryKeys } from './query-client';

interface ToggleInput {
  id: string;
  checked: boolean;
}

interface QuantityInput {
  id: string;
  quantity: number;
}

interface Rollback {
  previous?: ShoppingLine[];
}

export function registerResumableMutations(): void {
  queryClient.setMutationDefaults<ShoppingLine, Error, AddShoppingLineInput>(
    mutationKeys.addShoppingLine,
    {
      mutationFn: (input) =>
        authedRequest<ShoppingLine>('/shopping', {
          method: 'POST',
          body: input,
        }),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.shopping });
      },
    },
  );

  queryClient.setMutationDefaults<ShoppingLine, Error, ToggleInput, Rollback>(
    mutationKeys.toggleShoppingLine,
    {
      mutationFn: ({ id, checked }) =>
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
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.shopping });
      },
    },
  );

  queryClient.setMutationDefaults<ShoppingLine, Error, QuantityInput>(
    mutationKeys.setShoppingLineQuantity,
    {
      mutationFn: ({ id, quantity }) =>
        authedRequest<ShoppingLine>(`/shopping/${id}`, {
          method: 'PATCH',
          body: { quantity },
        }),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.shopping });
      },
    },
  );

  queryClient.setMutationDefaults<void, Error, string>(
    mutationKeys.removeShoppingLine,
    {
      mutationFn: (id) =>
        authedRequest<void>(`/shopping/${id}`, { method: 'DELETE' }),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.shopping });
      },
    },
  );
}

// Initialise les mutations par défaut au chargement du module
registerResumableMutations();
