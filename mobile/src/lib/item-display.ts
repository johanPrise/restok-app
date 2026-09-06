import { formatDistanceToNowStrict, format, isAfter, subDays } from 'date-fns';
import { translate } from '@/i18n';
import { dateLocale, type Locale } from '@/i18n/locales';
import type { Palette } from '@/theme';
import { RELATIVE_DATE_MAX_DAYS } from '@/theme';
import type { Item, ItemStatus, LastAction } from '@/types/api';
import { isCritical } from './stock';

/**
 * Couleur du statut. Ces teintes ne servent **qu'à ça** (§1) : c'est ce qui
 * rend l'étagère lisible d'un coup d'œil.
 */
export function statusColor(status: ItemStatus): keyof Palette {
  switch (status) {
    case 'available':
      return 'ok';
    case 'low':
      return 'low';
    default:
      return 'out';
  }
}

/** Libellé du badge, ou `null` quand l'item ne demande rien à personne. */
export function statusBadge(item: Item, locale: Locale): string | null {
  if (item.status === 'to_restock' || item.status === 'out_of_stock') {
    return translate(locale, 'stock.aRacheter');
  }
  if (item.status === 'low') {
    return isCritical(item)
      ? translate(locale, 'stock.critique')
      : translate(locale, 'stock.stockBas');
  }

  return null;
}

/**
 * §7 : les dates relatives basculent en date absolue au-delà d'une semaine.
 * « il y a 2 jours » informe ; « il y a 3 mois » ne dit plus rien d'utile.
 */
export function relativeDate(iso: string, locale: Locale): string {
  const date = new Date(iso);
  const threshold = subDays(new Date(), RELATIVE_DATE_MAX_DAYS);

  if (isAfter(date, threshold)) {
    return formatDistanceToNowStrict(date, {
      addSuffix: true,
      locale: dateLocale(locale),
    });
  }

  return format(date, 'd MMM', { locale: dateLocale(locale) });
}

/**
 * « Sam · il y a 2 jours ». Quand l'auteur a supprimé son compte, l'action
 * reste au tableau mais devient anonyme — l'événement a bien eu lieu.
 *
 * Seul, le nom est toujours le même : il ne reste que la date, qui elle
 * continue d'apprendre quelque chose.
 */
export function lastActionLabel(
  action: LastAction,
  locale: Locale,
  solo = false,
): string {
  if (solo) return relativeDate(action.at, locale);

  const who = action.memberName ?? translate(locale, 'item.quelquun');

  return `${who} · ${relativeDate(action.at, locale)}`;
}

/**
 * La ligne sous le nom du tag : le format du produit, puis qui a agi et quand.
 *
 * Les deux partagent la même place plutôt que d'ajouter une ligne. Le format
 * vient en premier parce qu'il sert à celui qui part faire les courses — il
 * décrit quoi acheter, là où la dernière action décrit ce qui s'est passé.
 */
export function tagMeta(
  item: Item,
  locale: Locale,
  solo = false,
): string | null {
  const parts = [
    item.format,
    item.lastAction ? lastActionLabel(item.lastAction, locale, solo) : null,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(' · ') : null;
}
