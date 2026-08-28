import { GroupHistoryEntry } from './action-history.service';

/**
 * Le registre, en CSV.
 *
 * Un journal qu'on ne peut pas remettre à quelqu'un ne sert qu'à celui qui le
 * regarde. Une association rend des comptes — à un bureau, à une assemblée —
 * et cela suppose un fichier, pas un écran.
 *
 * RFC 4180 : virgule, guillemets doublés, `CRLF`. Le tableur français
 * préférerait le point-virgule, mais un séparateur régional produit un fichier
 * que seul ce tableur-là relit ; la virgule se relit partout, y compris par le
 * script de quelqu'un qui voudra en faire autre chose.
 */

/** Excel lit l'UTF-8 de travers sans lui, et « Café » devient « CafÃ© ». */
export const BOM = '﻿';

const EOL = '\r\n';

const COLUMNS = ['date', 'membre', 'item', 'action', 'quantite'] as const;

/**
 * Échappe un champ.
 *
 * Un nom d'item est du texte libre : « Pastilles, format familial » contient
 * une virgule, et rien n'interdit d'y mettre un guillemet ou un retour à la
 * ligne. Sans échappement, une seule ligne mal formée décale toutes les
 * colonnes du fichier — et personne ne s'en aperçoit avant de lire un chiffre
 * dans la colonne des noms.
 */
function escape(value: string | number | null): string {
  if (value === null) return '';

  const text = String(value);
  if (!/[",\r\n]/.test(text)) return text;

  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Les actions, telles qu'un tableur les lira.
 *
 * La date part en ISO 8601 : c'est le seul format qu'un tableur, un script et
 * un humain lisent tous les trois sans se tromper d'ordre entre le jour et le
 * mois.
 *
 * L'action reste `taken` / `restocked`, non traduite. Ce fichier est une
 * donnée, pas un écran : le traduire le rendrait dépendant de la langue de
 * celui qui l'a exporté, et deux exports du même registre cesseraient de se
 * comparer.
 */
export function toCsv(entries: readonly GroupHistoryEntry[]): string {
  const lines = [
    COLUMNS.join(','),
    ...entries.map((entry) =>
      [
        entry.createdAt.toISOString(),
        // Vide plutôt qu'« Inconnu » : l'acte a bien eu lieu, c'est son auteur
        // qui a supprimé son compte. Inventer un nom serait pire que le trou.
        escape(entry.memberName),
        escape(entry.itemName),
        entry.actionType,
        escape(entry.quantity),
      ].join(','),
    ),
  ];

  return BOM + lines.join(EOL) + EOL;
}
