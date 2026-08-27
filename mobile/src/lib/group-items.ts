import { translate } from '@/i18n';
import { compare, type Locale } from '@/i18n/locales';
import type { Palette } from '@/theme';
import type { Item, ItemStatus } from '@/types/api';

export interface ItemSection {
  key: string;
  title: string;
  color: keyof Palette;
  items: Item[];
}

/**
 * L'ordre EST l'information (§5) : ce qui demande une action passe en tête,
 * jamais l'alphabétique. Une section vide disparaît — pas de « À racheter (0) »
 * qui occupe la place sans rien dire.
 */
const SECTIONS: {
  key: string;
  /** La clé, pas le mot : le titre se traduit au moment de l'affichage. */
  titleKey: string;
  color: keyof Palette;
  matches: (status: ItemStatus) => boolean;
}[] = [
  {
    key: 'to_restock',
    titleKey: 'stock.aRacheter',
    color: 'rustClay',
    matches: (s) => s === 'to_restock' || s === 'out_of_stock',
  },
  {
    key: 'low',
    titleKey: 'stock.stockBas',
    color: 'mustard',
    matches: (s) => s === 'low',
  },
  {
    key: 'available',
    titleKey: 'stock.disponible',
    color: 'sage',
    matches: (s) => s === 'available',
  },
];

export function groupByUrgency(
  items: Item[],
  locale: Locale,
): ItemSection[] {
  return SECTIONS.map(({ key, titleKey, color, matches }) => ({
    key,
    title: translate(locale, titleKey),
    color,
    // À urgence égale, l'alphabétique redevient le repère le plus prévisible.
    items: items
      .filter((item) => matches(item.status))
      .sort((a, b) => compare(locale, a.name, b.name)),
  })).filter((section) => section.items.length > 0);
}

/**
 * Filtre côté client : `GET /items` renvoie déjà tout l'inventaire d'un
 * groupe, donc chercher au serveur coûterait un aller-retour pour rien.
 */
export function searchItems(items: Item[], query: string): Item[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;

  return items.filter((item) => item.name.toLowerCase().includes(needle));
}
