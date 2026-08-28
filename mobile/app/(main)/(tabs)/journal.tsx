import { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useGroup, useMembers } from '@/api/groups';
import { HISTORY_LIMIT, useGroupHistory } from '@/api/history';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { TagCard } from '@/components/TagCard';
import { TagSkeleton } from '@/components/TagSkeleton';
import { Text } from '@/components/Text';
import { useT, useLocale } from '@/i18n/useT';
import { apiErrorMessage } from '@/lib/api-error';
import {
  groupByDay,
  isTruncated,
  journalSummary,
  periodLabel,
  since,
  type Period,
} from '@/lib/journal';
import { border, radius, spacing, useTheme } from '@/theme';
import type { GroupHistoryEntry } from '@/types/api';

/** Tout le monde, c'est-à-dire aucun filtre sur la personne. */
const EVERYONE = 'all';

/**
 * Le journal du groupe.
 *
 * C'est ce que le mode association a de plus que les autres, et la seule
 * chose : un **lieu** pour le registre. Une colocation demande « qui a fini le
 * café » — une question sur un objet, à laquelle le relevé d'un item répond
 * déjà. Une association demande « qu'a sorti untel, depuis quand » — une
 * question sur une personne dans le temps, et c'est exactement le couple de
 * filtres que le serveur expose.
 *
 * Sa route existe dans tous les modes — `TabList` doit déclarer les cinq une
 * fois pour toutes — donc l'adresse reste atteignable en colocation. On n'y
 * met pas de barrage : le serveur ouvre le registre à tous les membres, et
 * `<Redirect>` ne partirait de toute façon pas, faute pour la route d'avoir
 * jamais le focus quand aucun onglet ne la désigne. C'est la **barre** qui
 * s'adapte, en montrant l'onglet dès qu'on est dessus.
 */
export default function Journal() {
  const { colors } = useTheme();
  const group = useGroup();
  const members = useMembers();
  const locale = useLocale();
  const t = useT();
  const [period, setPeriod] = useState<Period>('month');
  const [who, setWho] = useState<string>(EVERYONE);

  // `useMemo` sur la borne : sans lui, chaque rendu produit une date
  // différente d'une milliseconde, donc une nouvelle clé de cache, donc un
  // aller-retour à chaque frappe ailleurs dans l'écran.
  const filters = useMemo(
    () => ({
      since: since(period),
      memberId: who === EVERYONE ? undefined : who,
    }),
    [period, who],
  );

  const history = useGroupHistory(filters);
  // `?? []` fabrique un tableau neuf à chaque rendu : mémoriser le regroupement
  // sur lui revenait à ne rien mémoriser du tout.
  const entries = useMemo(() => history.data ?? [], [history.data]);
  const days = useMemo(() => groupByDay(entries, locale), [entries, locale]);
  const coupé = isTruncated(entries, HISTORY_LIMIT);

  // Tant que le type du groupe est inconnu, on ne renvoie personne :
  // `useIsAssociation` répond « non » pendant le chargement, et une
  // association arrivant ici à froid serait éjectée vers l'étagère avant même
  // que la réponse arrive. Même garde que l'étape des notifications.
  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Text variant="display">{t('onglets.journal')}</Text>
        <Text variant="monoLabel" color="inkSoft" numberOfLines={1}>
          {history.isError
            ? t('journal.nonCharge')
            : `${group.data?.name ?? ''} · ${journalSummary(entries, locale)}`}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={history.isRefetching}
            onRefresh={() => void history.refetch()}
            tintColor={colors.pantryTeal}
          />
        }
      >
        <Segmented
          label={t('journal.periode')}
          value={period}
          options={(['month', 'quarter', 'all'] as const).map((value) => ({
            value,
            label: periodLabel(value, locale),
          }))}
          onChange={setPeriod}
        />

        {/* Le filtre par personne n'apparaît qu'à partir de deux membres :
            devant un groupe d'une personne, il ne proposerait qu'un choix. */}
        {(members.data?.length ?? 0) > 1 && (
          <WhoFilter
            members={members.data ?? []}
            value={who}
            onChange={setWho}
          />
        )}

        {history.isError && (
          <Text variant="caption" color="rustClay">
            {apiErrorMessage(history.error, locale)}
          </Text>
        )}

        {history.isPending &&
          Array.from({ length: 3 }, (_, index) => <TagSkeleton key={index} />)}

        {!history.isPending && entries.length === 0 && (
          <TagCard style={styles.empty}>
            <Text variant="tagName" color="inkSoft">
              {t('journal.rienSurPeriode')}
            </Text>
            <Text variant="body" color="inkSoft">
              {t(
                who === EVERYONE ? 'journal.videTous' : 'journal.videPersonne',
              )}
            </Text>
          </TagCard>
        )}

        {days.map((day) => (
          <View key={day.key} style={styles.day}>
            <Text variant="monoLabel" color="inkSoft">
              {day.label}
            </Text>
            <View style={[styles.rows, { borderColor: colors.thread }]}>
              {day.entries.map((entry) => (
                <Row key={entry.id} entry={entry} />
              ))}
            </View>
          </View>
        ))}

        {/* Le serveur ne pagine pas : au plafond, il se tait sur le reste. Le
            dire est le minimum qu'un registre doive à qui vient le lire. */}
        {coupé && (
          <Text variant="caption" color="inkSoft" style={styles.truncation}>
            {t('journal.tronque', { count: HISTORY_LIMIT })}
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

/**
 * Une ligne : qui, quoi, combien, quelle action.
 *
 * La date n'y est pas — c'est l'en-tête du jour qui la porte. Sur 390 points,
 * la lui ajouter tronquerait le nom de l'item, qui est ce qu'on vient lire.
 */
function Row({ entry }: Readonly<{ entry: GroupHistoryEntry }>) {
  const t = useT();

  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={[
        entry.memberName ?? t('item.quelquun'),
        t(entry.actionType === 'taken' ? 'journal.aPris' : 'journal.aRachete'),
        entry.quantity === null ? '' : entry.quantity,
        entry.itemName,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Text variant="mono" style={styles.who} numberOfLines={1}>
        {(entry.memberName ?? t('item.quelquun')).toUpperCase()}
      </Text>
      <Text
        variant="mono"
        color="inkSoft"
        style={styles.item}
        numberOfLines={1}
      >
        {entry.itemName}
      </Text>
      <Text variant="mono" style={styles.count}>
        {entry.quantity === null ? '' : `×${entry.quantity}`}
      </Text>
      <Text variant="mono" color="inkSoft" style={styles.action}>
        {t(entry.actionType === 'taken' ? 'commun.pris' : 'commun.rachete')}
      </Text>
    </View>
  );
}

/**
 * Le filtre par personne.
 *
 * Une rangée qui défile plutôt qu'un `Segmented` : une association peut avoir
 * quarante membres, et trois colonnes fixes deviendraient trois colonnes de
 * deux caractères.
 */
function WhoFilter({
  members,
  value,
  onChange,
}: Readonly<{
  members: readonly { id: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
}>) {
  const { colors } = useTheme();
  const t = useT();
  const choices = [
    { id: EVERYONE, name: t('journal.toutLeMonde') },
    ...members,
  ];

  return (
    <View style={styles.group}>
      <Text variant="monoLabel" color="inkSoft">
        {t('journal.qui')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        accessibilityRole="radiogroup"
      >
        {choices.map((choice) => {
          const selected = choice.id === value;

          return (
            <Pressable
              key={choice.id}
              accessibilityRole="radio"
              // Voir `Segmented` : `accessibilityState` seul est muet sur le web.
              aria-checked={selected}
              onPress={() => onChange(choice.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected
                    ? colors.pantryTeal
                    : colors.paperRaised,
                  borderColor: selected ? colors.pantryTeal : colors.thread,
                },
              ]}
            >
              <Text
                variant="monoLabel"
                color={selected ? 'paperRaised' : 'ink'}
                numberOfLines={1}
              >
                {choice.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.sm, gap: 2 },
  body: { paddingTop: spacing.md, gap: spacing.lg, paddingBottom: spacing.lg },
  group: { gap: spacing.xs },
  chips: { gap: spacing.xs, paddingRight: spacing.md },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: border.hairline,
    maxWidth: 180,
  },
  day: { gap: spacing.xs },
  rows: {
    gap: spacing.xs,
    borderTopWidth: border.hairline,
    paddingTop: spacing.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  who: { width: 76 },
  item: { flex: 1 },
  count: { width: 34, textAlign: 'right' },
  action: { width: 62, textAlign: 'right' },
  empty: { gap: spacing.xs },
  truncation: { textAlign: 'center' },
});
