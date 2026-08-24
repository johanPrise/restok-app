import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { GroupHistoryEntry } from '@/types/api';

/** Une journée du journal, et ce qui s'y est passé. */
export interface JournalDay {
  /** Clé stable, indépendante de l'affichage : « 2026-08-24 ». */
  key: string;
  /** « 24 AOÛT », comme sur un relevé. */
  label: string;
  entries: GroupHistoryEntry[];
}

/**
 * Regroupe le journal par jour.
 *
 * Le jour devient un en-tête plutôt qu'une colonne répétée. Sur 390 points de
 * large, une ligne doit déjà porter qui, quoi, combien et quelle action : lui
 * ajouter la date tronquerait le nom de l'item, qui est précisément ce qu'on
 * vient lire.
 *
 * L'ordre du serveur est conservé — du plus récent au plus ancien — parce que
 * c'est celui dans lequel on relit un registre.
 */
export function groupByDay(
  entries: readonly GroupHistoryEntry[],
): JournalDay[] {
  const days: JournalDay[] = [];

  for (const entry of entries) {
    const date = new Date(entry.createdAt);
    const key = format(date, 'yyyy-MM-dd');
    const last = days[days.length - 1];

    if (last?.key === key) {
      last.entries.push(entry);
      continue;
    }

    days.push({ key, label: journalDay(date), entries: [entry] });
  }

  return days;
}

/** « 24 AOÛT ». */
function journalDay(date: Date): string {
  return format(date, 'd MMMM', { locale: fr })
    .replace('.', '')
    .toUpperCase();
}

/**
 * Le registre est-il coupé ?
 *
 * Le serveur ne pagine pas : il rend au plus `limit` lignes et se tait sur le
 * reste. Atteindre exactement le plafond ne prouve pas qu'il manque quelque
 * chose — mais ne pas le dire, alors qu'on lit un registre pour savoir ce qui
 * s'est passé, serait pire que de le dire pour rien.
 */
export function isTruncated(
  entries: readonly GroupHistoryEntry[],
  limit: number,
): boolean {
  return entries.length >= limit;
}

/** Les fenêtres proposées. « Tout » se lit sous le plafond du serveur. */
export type Period = 'month' | 'quarter' | 'all';

const DAYS: Record<Exclude<Period, 'all'>, number> = {
  month: 30,
  quarter: 90,
};

export const PERIOD_LABELS: Record<Period, string> = {
  month: '30 jours',
  quarter: '3 mois',
  all: 'Tout',
};

/**
 * La borne basse à envoyer au serveur, ou `undefined` pour ne pas en poser.
 *
 * `now` est un paramètre plutôt qu'un `new Date()` interne : sans lui, la
 * fonction ne serait pas testable sans geler l'horloge.
 */
export function since(period: Period, now: Date = new Date()): string | undefined {
  if (period === 'all') return undefined;

  const from = new Date(now);
  from.setDate(from.getDate() - DAYS[period]);

  return from.toISOString();
}

/**
 * « 3 prises, 1 rachat » — ce que la période contient, en une ligne.
 *
 * Le singulier à zéro comme à un, règle du français que `plural()` applique
 * déjà aux unités.
 */
export function journalSummary(entries: readonly GroupHistoryEntry[]): string {
  const taken = entries.filter((e) => e.actionType === 'taken').length;
  const restocked = entries.length - taken;
  const s = (count: number) => (count < 2 ? '' : 's');

  return `${taken} prise${s(taken)}, ${restocked} rachat${s(restocked)}`;
}
