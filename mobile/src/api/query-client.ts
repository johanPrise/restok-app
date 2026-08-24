import { QueryClient } from '@tanstack/react-query';
import type { AddShoppingLineInput, ShoppingLine } from '@/types/api';
import { authedRequest } from './authed';
import { ApiError } from './client';
import { mutationKeys } from './mutation-keys';

const MAX_RETRIES = 2;

/**
 * Un jour. C'est `gcTime` qui décide de ce qui vaut la peine d'être écrit sur
 * disque : une entrée ramassée en cinq minutes ne survivrait pas à la
 * fermeture de l'app, et le cache persistant ne servirait à rien.
 */
const DISK_LIFETIME = 1000 * 60 * 60 * 24;

export const queryKeys = {
  group: ['group'] as const,
  members: ['members'] as const,
  items: ['items'] as const,
  shopping: ['shopping'] as const,
  recipes: ['recipes'] as const,
  recipeSearch: ['recipe-search'] as const,
  /**
   * Racine distincte de `items`, et non `['items', id, 'history']` :
   * l'invalidation de TanStack Query se fait par préfixe, donc la moindre
   * action sur un item rafraîchissait l'historique de **tous** les items déjà
   * consultés — et, après une suppression, allait chercher celui d'un item qui
   * n'existe plus (404).
   */
  itemHistory: (itemId: string) => ['item-history', itemId] as const,
  /**
   * Le journal du groupe. Les filtres entrent dans la clé : chaque vue a son
   * cache, et revenir de « ce qu'a sorti Lou » à « tout le groupe » n'est pas
   * un nouvel aller-retour.
   */
  groupHistory: (filters: { memberId?: string; since?: string } = {}) =>
    ['group-history', filters.memberId ?? null, filters.since ?? null] as const,
};

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Réessayer un 401 ou un 404 ne changera rien — seules les pannes
        // réseau et les 5xx méritent une seconde chance.
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status < 500) return false;
          return failureCount < MAX_RETRIES;
        },
        staleTime: 30_000,
        gcTime: DISK_LIFETIME,
      },
      mutations: { retry: false },
    },
  });
}

/**
 * Les gestes rejouables déclarés hors de tout composant.
 *
 * Une mutation reprise après un redémarrage n'a plus de composant pour lui
 * fournir sa fonction : elle ne retrouve que ce qui est enregistré ici. Les
 * callbacks ferment sur le `queryClient` singleton plutôt que de compter sur un
 * contexte de rendu, pour la même raison.
 */
interface ToggleInput {
  id: string;
  checked: boolean;
}

interface QuantityInput {
  id: string;
  quantity: number;
}

/** Ce que `onMutate` met de côté pour pouvoir revenir en arrière. */
interface Rollback {
  previous?: ShoppingLine[];
}

function registerResumableMutations(client: QueryClient): void {
  client.setMutationDefaults<ShoppingLine, Error, AddShoppingLineInput>(
    mutationKeys.addShoppingLine,
    {
      mutationFn: (input) =>
        authedRequest<ShoppingLine>('/shopping', {
          method: 'POST',
          body: input,
        }),
      onSuccess: () => {
        void client.invalidateQueries({ queryKey: queryKeys.shopping });
      },
    },
  );

  client.setMutationDefaults<ShoppingLine, Error, ToggleInput, Rollback>(
    mutationKeys.toggleShoppingLine,
    {
      mutationFn: ({ id, checked }) =>
        authedRequest<ShoppingLine>(`/shopping/${id}`, {
          method: 'PATCH',
          body: { checked },
        }),
      // Cocher est le geste du magasin, et le seul qui parte en rafale : il
      // doit répondre au doigt, pas au réseau.
      onMutate: async ({ id, checked }) => {
        // Un refetch déjà en vol écraserait la bascule avec l'état d'avant.
        await client.cancelQueries({ queryKey: queryKeys.shopping });
        const previous = client.getQueryData<ShoppingLine[]>(
          queryKeys.shopping,
        );

        client.setQueryData<ShoppingLine[]>(queryKeys.shopping, (lines) =>
          lines?.map((line) => (line.id === id ? { ...line, checked } : line)),
        );

        return { previous };
      },
      onError: (_error, _input, context) => {
        if (context?.previous) {
          client.setQueryData(queryKeys.shopping, context.previous);
        }
      },
      onSettled: () => {
        void client.invalidateQueries({ queryKey: queryKeys.shopping });
      },
    },
  );

  client.setMutationDefaults<ShoppingLine, Error, QuantityInput>(
    mutationKeys.setShoppingLineQuantity,
    {
      mutationFn: ({ id, quantity }) =>
        authedRequest<ShoppingLine>(`/shopping/${id}`, {
          method: 'PATCH',
          body: { quantity },
        }),
      onSuccess: () => {
        void client.invalidateQueries({ queryKey: queryKeys.shopping });
      },
    },
  );

  client.setMutationDefaults<void, Error, string>(
    mutationKeys.removeShoppingLine,
    {
      mutationFn: (id) =>
        authedRequest<void>(`/shopping/${id}`, { method: 'DELETE' }),
      onSuccess: () => {
        void client.invalidateQueries({ queryKey: queryKeys.shopping });
      },
    },
  );
}

/**
 * Instance unique, exportée plutôt que créée dans un composant.
 *
 * `authedRequest` doit pouvoir vider le cache quand le serveur invalide une
 * session — or ce n'est pas un hook, et l'appel arrive hors de tout rendu. Sans
 * ce point d'accès, une déconnexion automatique laissait l'étagère du compte
 * précédent en mémoire, visible par le suivant le temps d'un refetch.
 */
export const queryClient = createQueryClient();

registerResumableMutations(queryClient);
