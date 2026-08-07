import { formatDistanceToNowStrict, format, isAfter, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Palette } from '@/theme';
import { RELATIVE_DATE_MAX_DAYS } from '@/theme';
import type { Item, ItemStatus } from '@/types/api';
import { isCritical } from './stock';

/**
 * Couleur du statut. Ces teintes ne servent **qu'à ça** (§1) : c'est ce qui
 * rend l'étagère lisible d'un coup d'œil.
 */
export function statusColor(status: ItemStatus): keyof Palette {
  switch (status) {
    case 'available':
      return 'sage';
    case 'low':
      return 'mustard';
    default:
      return 'rustClay';
  }
}

/** Libellé du badge, ou `null` quand l'item ne demande rien à personne. */
export function statusBadge(item: Item): string | null {
  if (item.status === 'to_restock' || item.status === 'out_of_stock') {
    return 'À racheter';
  }
  if (item.status === 'low') {
    return isCritical(item) ? 'Critique' : 'Stock bas';
  }

  return null;
}

/**
 * §7 : les dates relatives basculent en date absolue au-delà d'une semaine.
 * « il y a 2 jours » informe ; « il y a 3 mois » ne dit plus rien d'utile.
 */
export function relativeDate(iso: string): string {
  const date = new Date(iso);
  const threshold = subDays(new Date(), RELATIVE_DATE_MAX_DAYS);

  if (isAfter(date, threshold)) {
    return formatDistanceToNowStrict(date, { addSuffix: true, locale: fr });
  }

  return format(date, 'd MMM', { locale: fr });
}
