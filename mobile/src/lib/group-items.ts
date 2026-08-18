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
  title: string;
  color: keyof Palette;
  matches: (status: ItemStatus) => boolean;
}[] = [
  {
    key: 'to_restock',
    title: 'À racheter',
    color: 'rustClay',
    matches: (s) => s === 'to_restock' || s === 'out_of_stock',
  },
  {
    key: 'low',
    title: 'Stock bas',
    color: 'mustard',
    matches: (s) => s === 'low',
  },
  {
    key: 'available',
    title: 'Disponible',
    color: 'sage',
    matches: (s) => s === 'available',
  },
];

export function groupByUrgency(items: Item[]): ItemSection[] {
  return SECTIONS.map(({ key, title, color, matches }) => ({
    key,
    title,
    color,
    // À urgence égale, l'alphabétique redevient le repère le plus prévisible.
    items: items
      .filter((item) => matches(item.status))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
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
