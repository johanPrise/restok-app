import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './client';

const MAX_RETRIES = 2;

export const queryKeys = {
  group: ['group'] as const,
  members: ['members'] as const,
  items: ['items'] as const,
  itemHistory: (itemId: string) => ['items', itemId, 'history'] as const,
};

export function createQueryClient(): QueryClient {
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
