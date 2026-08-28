import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSession } from '@/store/session';
import type { GroupHistoryPage } from '@/types/api';
import { authedRequest } from './authed';
import { queryKeys } from './query-client';

/** Une page. Le reste se demande en descendant. */
const PAGE_SIZE = 50;

export interface JournalFilters {
  /** L'identifiant d'un membre, ou `undefined` pour tout le groupe. */
  memberId?: string;
  /** Borne basse, en ISO. Le serveur ne rend rien d'antérieur. */
  since?: string;
}

/**
 * Le journal du groupe, page par page.
 *
 * Il s'arrêtait à 200 lignes et le disait — « restreins la période pour voir
 * plus loin ». C'était un aveu, pas une réponse : pour une association active,
 * 200 lignes font une semaine, et un registre qu'on ne peut pas remonter ne
 * prouve rien de ce qui s'est passé avant.
 *
 * Les filtres partent au serveur plutôt que d'être appliqués ici : filtrer une
 * page déjà reçue ne montrerait qu'une part de la dernière semaine en la
 * faisant passer pour l'année.
 *
 * Chaque combinaison de filtres a sa propre clé, donc son propre cache :
 * revenir à « tout le groupe » ne redemande rien.
 */
export function useGroupHistory(filters: JournalFilters = {}) {
  const groupId = useSession((s) => s.member?.groupId);

  const query = useInfiniteQuery({
    queryKey: queryKeys.groupHistory(filters),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (filters.memberId) params.set('memberId', filters.memberId);
      if (filters.since) params.set('since', filters.since);
      if (pageParam) params.set('cursor', pageParam);

      return authedRequest<GroupHistoryPage>(`/history?${params}`);
    },
    // `null` dit qu'on tient la fin ; TanStack Query attend `undefined` pour
    // arrêter de proposer une suite.
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(groupId),
  });

  // Les pages recollées, pour que l'écran continue de lire une seule liste.
  const entries = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.entries),
    [query.data],
  );

  return { ...query, entries };
}
