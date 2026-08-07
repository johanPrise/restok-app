import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useGroup } from '@/api/groups';
import { useItems } from '@/api/items';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { StockTag } from '@/components/StockTag';
import { TagSkeleton } from '@/components/TagSkeleton';
import { Text } from '@/components/Text';
import { groupByUrgency, searchItems } from '@/lib/group-items';
import {
  border,
  fontFamily,
  fontSize,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  useTheme,
} from '@/theme';

export default function Shelf() {
  const router = useRouter();
  const { colors } = useTheme();
  const group = useGroup();
  const items = useItems();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const sections = useMemo(
    () => groupByUrgency(searchItems(items.data ?? [], query)),
    [items.data, query],
  );

  const toRestock = (items.data ?? []).filter(
    (item) => item.status === 'to_restock' || item.status === 'out_of_stock',
  ).length;

  const toggle = (key: string) =>
    setCollapsed((state) => ({ ...state, [key]: !state[key] }));

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title" numberOfLines={1}>
          {group.data?.name ?? ' '}
        </Text>
        <Text
          variant="monoLabel"
          color={toRestock > 0 ? 'rustClay' : 'inkSoft'}
        >
          {summary(toRestock, items.data?.length ?? 0)}
        </Text>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher un item"
        placeholderTextColor={colors.inkSoft}
        autoCorrect={false}
        style={[
          styles.search,
          {
            backgroundColor: colors.paperRaised,
            borderColor: colors.thread,
            color: colors.ink,
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={items.isRefetching}
            onRefresh={() => void items.refetch()}
            tintColor={colors.pantryTeal}
          />
        }
      >
        {items.isPending &&
          Array.from({ length: 3 }, (_, index) => <TagSkeleton key={index} />)}

        {!items.isPending && sections.length === 0 && (
          <EmptyState searching={query.trim().length > 0} />
        )}

        {sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <SectionHeader
              title={section.title}
              count={section.items.length}
              color={section.color}
              collapsed={collapsed[section.key] ?? false}
              onToggle={() => toggle(section.key)}
            />
            {!collapsed[section.key] &&
              section.items.map((item) => (
                <StockTag
                  key={item.id}
                  item={item}
                  onPress={() => router.push(`/items/${item.id}`)}
                />
              ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

/** Un résumé en une ligne, jamais un graphique (§5). */
function summary(toRestock: number, total: number): string {
  if (total === 0) return 'Inventaire vide';
  if (toRestock === 0) return 'Tout est en stock';

  return `${toRestock} item${toRestock > 1 ? 's' : ''} à racheter`;
}

function EmptyState({ searching }: Readonly<{ searching: boolean }>) {
  return (
    <View style={styles.empty}>
      <Text variant="tagName" color="inkSoft" style={styles.emptyTitle}>
        {searching ? 'Aucun résultat' : 'Étagère vide'}
      </Text>
      <Text variant="body" color="inkSoft" style={styles.emptyBody}>
        {searching
          ? 'Aucun item ne porte ce nom.'
          : 'Ajoute le premier item que ton groupe suit.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.sm, gap: 2 },
  search: {
    minHeight: MIN_TOUCH_TARGET,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: border.hairline,
    borderRadius: radius.button,
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
  },
  list: { paddingVertical: spacing.md, gap: spacing.md },
  section: { gap: spacing.xs },
  empty: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.xs },
  emptyTitle: { textAlign: 'center' },
  emptyBody: { textAlign: 'center' },
});
