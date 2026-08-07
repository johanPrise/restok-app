import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { StyleSheet, View } from 'react-native';
import { spacing } from '@/theme';
import type { ActionType, HistoryEntry } from '@/types/api';
import { Text } from './Text';

interface ReceiptHistoryProps {
  entries: HistoryEntry[];
  loading?: boolean;
}

/**
 * L'historique lu comme un relevé de caisse (§5) : tout en mono, aligné en
 * colonnes, encadré de deux lignes de déchirure.
 *
 * La date n'est répétée que lorsqu'elle change — trois prises le même jour se
 * lisent comme un bloc, pas comme trois lignes indépendantes.
 */
export function ReceiptHistory({
  entries,
  loading = false,
}: Readonly<ReceiptHistoryProps>) {
  if (loading) {
    return (
      <Text variant="mono" color="inkSoft">
        Chargement de l&apos;historique…
      </Text>
    );
  }

  if (entries.length === 0) {
    return (
      <Text variant="body" color="inkSoft">
        Aucune action pour l&apos;instant — le premier qui prend quelque chose
        ouvre le bal.
      </Text>
    );
  }

  let previousDay: string | null = null;

  return (
    <View style={styles.receipt}>
      <TearLine />

      {entries.map((entry) => {
        const day = receiptDate(entry.createdAt);
        const repeated = day === previousDay;
        previousDay = day;

        return (
          <View key={entry.id} style={styles.row}>
            <Text variant="mono" color="inkSoft" style={styles.date}>
              {repeated ? '' : day}
            </Text>
            <Text variant="mono" style={styles.who} numberOfLines={1}>
              {(entry.member?.name ?? "Quelqu'un").toUpperCase()}
            </Text>
            <Text variant="mono" color="inkSoft" style={styles.action}>
              {actionLabel(entry.actionType)}
            </Text>
          </View>
        );
      })}

      <TearLine />
    </View>
  );
}

/**
 * Le pointillé est composé de vrais caractères plutôt que d'un `borderStyle:
 * 'dashed'`, dont le rendu diffère entre iOS et Android. En mono, le motif est
 * régulier au pixel près.
 */
function TearLine() {
  return (
    <Text variant="mono" color="thread" numberOfLines={1}>
      {'─ '.repeat(60)}
    </Text>
  );
}

/** « 24 JUIL », comme sur un ticket. */
function receiptDate(iso: string): string {
  return format(new Date(iso), 'd MMM', { locale: fr })
    .replace('.', '')
    .toUpperCase();
}

function actionLabel(action: ActionType): string {
  return action === 'taken' ? 'pris' : 'racheté';
}

const DATE_WIDTH = 68;
const ACTION_WIDTH = 64;

const styles = StyleSheet.create({
  receipt: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  date: { width: DATE_WIDTH },
  who: { flex: 1 },
  action: { width: ACTION_WIDTH, textAlign: 'right' },
});
