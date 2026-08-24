import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/store/session';
import type { GroupHistoryEntry } from '@/types/api';
import { authedRequest } from './authed';
import { queryKeys } from './query-client';

/**
 * Le plafond du serveur. Il n'y a pas de pagination : au-delà, le journal ne
 * renvoie simplement pas le reste. L'écran doit donc le dire — un registre qui
 * s'arrête sans prévenir ment sur ce qu'il contient.
 */
export const HISTORY_LIMIT = 200;

export interface JournalFilters {
  /** L'identifiant d'un membre, ou `undefined` pour tout le groupe. */
  memberId?: string;
  /** Borne basse, en ISO. Le serveur ne rend rien d'antérieur. */
  since?: string;
}

/**
 * Le journal du groupe.
 *
 * Les filtres partent au serveur plutôt que d'être appliqués ici : c'est lui
 * qui porte le plafond, et filtrer après coup ne ferait que trier les 200
 * dernières lignes toutes personnes confondues — on croirait lire l'année de
 * quelqu'un alors qu'on ne lirait que sa part de la dernière semaine.
 *
 * Chaque combinaison de filtres a sa propre clé, donc son propre cache :
 * revenir à « tout le groupe » ne redemande rien.
 */
export function useGroupHistory(filters: JournalFilters = {}) {
  const groupId = useSession((s) => s.member?.groupId);

  return useQuery({
    queryKey: queryKeys.groupHistory(filters),
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(HISTORY_LIMIT) });
      if (filters.memberId) params.set('memberId', filters.memberId);
      if (filters.since) params.set('since', filters.since);

      return authedRequest<GroupHistoryEntry[]>(`/history?${params}`);
    },
    enabled: Boolean(groupId),
  });
}
