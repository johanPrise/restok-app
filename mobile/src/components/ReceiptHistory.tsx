import { format } from 'date-fns';
import { StyleSheet, View } from 'react-native';
import { dateLocale, type Locale } from '@/i18n/locales';
import { useLocale, useT } from '@/i18n/useT';
import { spacing } from '@/theme';
import type { ActionType, HistoryEntry } from '@/types/api';
import { Text } from './Text';

interface ReceiptHistoryProps {
  entries: HistoryEntry[];
  loading?: boolean;
  /** Dans un groupe d'une personne, nommer l'auteur n'apprend rien. */
  solo?: boolean;
}

/**
 * L'historique lu comme un relevé de caisse (§5) : tout en mono, aligné en
 * colonnes, encadré de deux lignes de déchirure.
 *
 * La date n'est répétée que lorsqu'elle change — trois prises le même jour se
 * lisent comme un bloc, pas comme trois lignes indépendantes.
 *
 * Seul, la colonne « qui » tombe entièrement : elle répéterait le même nom à
 * chaque ligne, en capitales, sur le quart de la largeur. C'est la place que
 * la date récupère.
 */
export function ReceiptHistory({
  entries,
  loading = false,
  solo = false,
}: Readonly<ReceiptHistoryProps>) {
  const t = useT();
  const locale = useLocale();

  if (loading) {
    return (
      <Text variant="data" color="inkSoft">
        {t('commun.chargementHistorique')}
      </Text>
    );
  }

  if (entries.length === 0) {
    return (
      <Text variant="body" color="inkSoft">
        {solo ? t('commun.relevéVideSolo') : t('commun.relevéVideGroupe')}
      </Text>
    );
  }

  let previousDay: string | null = null;

  return (
    <View style={styles.receipt}>
      <TearLine />

      {entries.map((entry) => {
        const day = receiptDate(entry.createdAt, locale);
        const repeated = day === previousDay;
        previousDay = day;

        return (
          <View key={entry.id} style={styles.row}>
            <Text
              variant="data"
              color="inkSoft"
              style={[styles.date, solo && styles.dateAlone]}
            >
              {repeated ? '' : day}
            </Text>
            {!solo && (
              <Text variant="data" style={styles.who} numberOfLines={1}>
                {(entry.member?.name ?? t('item.quelquun')).toUpperCase()}
              </Text>
            )}
            {/* Vide en suivi binaire : la colonne reste, pour que les lignes
                s'alignent comme sur un vrai relevé. */}
            <Text variant="data" style={styles.count}>
              {entry.quantity === null ? '' : `×${entry.quantity}`}
            </Text>
            <Text variant="data" color="inkSoft" style={styles.action}>
              {actionLabel(entry.actionType, t)}
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
    <Text variant="data" color="rule" numberOfLines={1}>
      {'─ '.repeat(60)}
    </Text>
  );
}

/**
 * « 24 JUIL », comme sur un ticket — et « 24 JUL » en anglais.
 *
 * Le point abrégeant le mois saute : le relevé est en capitales, et « JUIL. »
 * y traîne une ponctuation qu'aucun ticket n'imprime.
 */
function receiptDate(iso: string, locale: Locale): string {
  return format(new Date(iso), 'd MMM', { locale: dateLocale(locale) })
    .replace('.', '')
    .toUpperCase();
}

function actionLabel(action: ActionType, t: (key: string) => string): string {
  return t(action === 'taken' ? 'commun.pris' : 'commun.rachete');
}

const DATE_WIDTH = 62;
const COUNT_WIDTH = 34;
const ACTION_WIDTH = 62;

const styles = StyleSheet.create({
  receipt: { gap: spacing.tight },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.tight },
  date: { width: DATE_WIDTH },
  // Sans la colonne « qui », c'est la date qui prend l'espace restant : sinon
  // le compte et l'action se recolleraient à elle au lieu de rester alignés à
  // droite, et le relevé cesserait de ressembler à un relevé.
  dateAlone: { width: 'auto', flex: 1 },
  who: { flex: 1 },
  count: { width: COUNT_WIDTH, textAlign: 'right' },
  action: { width: ACTION_WIDTH, textAlign: 'right' },
});
