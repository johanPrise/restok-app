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
import { Button } from '@/components/Button';
import { EditableGroupName } from '@/components/EditableGroupName';
import { FAB_SIZE } from '@/components/Fab';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { SwipeableStockTag } from '@/components/SwipeableStockTag';
import { TagSkeleton } from '@/components/TagSkeleton';
import { Text } from '@/components/Text';
import { groupByUrgency, searchItems } from '@/lib/group-items';
import { useSession } from '@/store/session';
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
  const isAdmin = useSession((s) => s.member?.role) === 'admin';
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
    // Pas d'`edges` en bas : la barre d'onglets absorbe déjà l'encoche.
    <Screen edges={['top']}>
      <View style={styles.header}>
        <EditableGroupName
          name={group.data?.name ?? ' '}
          editable={isAdmin && group.data !== undefined}
        />
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
          <EmptyState
            searching={query.trim().length > 0}
            onAdd={isAdmin ? () => router.push('/items/new') : undefined}
          />
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
                <SwipeableStockTag
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

function EmptyState({
  searching,
  onAdd,
}: Readonly<{ searching: boolean; onAdd?: () => void }>) {
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
      {/* §5 : l'étagère vide propose l'action directement, sans faire chercher
          le bouton flottant. */}
      {!searching && onAdd && (
        <Button
          label="Ajouter un item"
          onPress={onAdd}
          style={styles.emptyAdd}
        />
      )}
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
  list: {
    paddingTop: spacing.md,
    // Le FAB flotte au-dessus de la liste : sans cette réserve, il masque le
    // dernier tag une fois le défilement en bout de course.
    paddingBottom: spacing.md * 2 + FAB_SIZE,
    gap: spacing.md,
  },
  section: { gap: spacing.xs },
  empty: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.xs },
  emptyTitle: { textAlign: 'center' },
  emptyBody: { textAlign: 'center' },
  emptyAdd: { marginTop: spacing.sm, alignSelf: 'stretch' },
});
