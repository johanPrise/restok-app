import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './client';

const MAX_RETRIES = 2;

export const queryKeys = {
  group: ['group'] as const,
  members: ['members'] as const,
  items: ['items'] as const,
  /**
   * Racine distincte de `items`, et non `['items', id, 'history']` :
   * l'invalidation de TanStack Query se fait par préfixe, donc la moindre
   * action sur un item rafraîchissait l'historique de **tous** les items déjà
   * consultés — et, après une suppression, allait chercher celui d'un item qui
   * n'existe plus (404).
   */
  itemHistory: (itemId: string) => ['item-history', itemId] as const,
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
      },
      mutations: { retry: false },
    },
  });
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
