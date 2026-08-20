import { Image } from 'expo-image';
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
import { useIsOnline } from '@/api/network';
import { useRecipes } from '@/api/recipes';
import { useShoppingList } from '@/api/shopping';
import { Button } from '@/components/Button';
import { EditableGroupName } from '@/components/EditableGroupName';
import { FeasibleTonight } from '@/components/FeasibleTonight';
import { FAB_SIZE } from '@/components/Fab';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { SwipeableStockTag } from '@/components/SwipeableStockTag';
import { SwipeHint } from '@/components/SwipeHint';
import { TagSkeleton } from '@/components/TagSkeleton';
import { Text } from '@/components/Text';
import { apiErrorMessage } from '@/lib/api-error';
import { groupByUrgency, searchItems } from '@/lib/group-items';
import { offlineNotice } from '@/lib/offline';
import { feasibleNow } from '@/lib/recipes';
import { itemsOnList } from '@/lib/shopping-list';
import { usePendingGestures } from '@/lib/usePendingGestures';
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
  const shopping = useShoppingList();
  const recipes = useRecipes();
  const online = useIsOnline();
  const pending = usePendingGestures();
  const isAdmin = useSession((s) => s.member?.role) === 'admin';
  const swipeLearned = useSession((s) => s.swipeLearned);
  const markSwipeLearned = useSession((s) => s.markSwipeLearned);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Croisé ici plutôt que renvoyé par `GET /items` : les deux listes sont déjà
  // en cache, et l'étagère reste ignorante des courses côté serveur.
  const onList = useMemo(
    () => itemsOnList(shopping.data ?? []),
    [shopping.data],
  );

  const tonight = useMemo(
    () => feasibleNow(recipes.data ?? [], items.data ?? []),
    [recipes.data, items.data],
  );

  const sections = useMemo(
    () => groupByUrgency(searchItems(items.data ?? [], query)),
    [items.data, query],
  );

  const toRestock = (items.data ?? []).filter(
    (item) => item.status === 'to_restock' || item.status === 'out_of_stock',
  ).length;

  const headerSummary = items.isError
    ? 'Étagère non chargée'
    : summary(toRestock, items.data?.length ?? 0);
  const headerSummaryColor =
    items.isError || toRestock > 0 ? 'rustClay' : 'inkSoft';

  // Prendre et racheter ne sont pas persistés : hors-ligne, le balayage se
  // mettait en pause sans que rien ne bouge à l'écran, et le geste disparaissait
  // à la fermeture de l'app. Il faut au moins le dire.
  const notice = offlineNotice(online, pending.durable, pending.volatile);

  const toggle = (key: string) =>
    setCollapsed((state) => ({ ...state, [key]: !state[key] }));

  return (
    // Pas d'`edges` en bas : la barre d'onglets absorbe déjà l'encoche.
    <Screen edges={['top']}>
      {/* Un en-tête, pas une ligne de titre : le nom du groupe est ce que le
          groupe partage, il mérite le milieu de l'écran plutôt qu'un coin. */}
      <View style={styles.header}>
        <EditableGroupName
          name={group.data?.name ?? ' '}
          editable={isAdmin && group.data !== undefined}
        />
        <Text
          variant="monoLabel"
          color={headerSummaryColor}
          style={styles.headerSummary}
        >
          {headerSummary}
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

      {notice !== null && (
        <Text variant="caption" color="inkSoft" style={styles.notice}>
          {notice}
        </Text>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.list,
          // La barre d'onglets est ancrée, pas en survol — `TabSlot` s'arrête
          // déjà au-dessus d'elle. Seul le FAB flotte encore sur cette liste :
          // sans cette réserve, le dernier tag resterait caché dessous.
          { paddingBottom: FAB_SIZE + spacing.md },
        ]}
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
        {/* Au-dessus du premier tag, et seulement s'il y en a un : un geste
            s'explique là où il s'exerce, pas sur une étagère vide. */}
        {!swipeLearned && sections.length > 0 && (
          <SwipeHint onDismiss={() => void markSwipeLearned()} />
        )}

        <FeasibleTonight
          recipes={tonight}
          onPress={(recipe) => router.push(`/recipes/${recipe.id}`)}
        />

        {items.isPending &&
          Array.from({ length: 3 }, (_, index) => <TagSkeleton key={index} />)}

        {/* Un stock vide et un serveur injoignable produisaient le même écran :
            `items.data ?? []` avale l'échec réseau, et « Étagère vide » se
            montrait alors qu'en fait rien n'avait pu être chargé. Le premier
            n'a rien à corriger ; le second demande de relancer le backend. */}
        {items.isError && (
          <ErrorState
            message={apiErrorMessage(items.error)}
            onRetry={() => void items.refetch()}
          />
        )}

        {!items.isPending && !items.isError && sections.length === 0 && (
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
                  onList={onList.has(item.id)}
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

function ErrorState({
  message,
  onRetry,
}: Readonly<{ message: string; onRetry: () => void }>) {
  return (
    <View style={styles.empty}>
      {/* Le titre nomme ce que la personne voit — une étagère vide d'un coup —
          et non la panne technique qui l'a causée. */}
      <Text variant="tagName" color="rustClay" style={styles.emptyTitle}>
        Étagère indisponible
      </Text>
      <Text variant="body" color="inkSoft" style={styles.emptyBody}>
        {message}
      </Text>
      <Button label="Réessayer" onPress={onRetry} style={styles.emptyAdd} />
    </View>
  );
}

function EmptyState({
  searching,
  onAdd,
}: Readonly<{ searching: boolean; onAdd?: () => void }>) {
  return (
    <View style={styles.empty}>
      {/* Seule l'étagère vraiment vide montre l'étagère vide : une recherche
          sans résultat n'a rien à voir avec l'état du stock. */}
      {!searching && (
        <Image
          source={require('../../../assets/illustrations/etagere_2.png')}
          style={styles.emptyIllustration}
          contentFit="contain"
          accessibilityLabel="Une étagère de rangement vide, sans aucun item"
        />
      )}
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
  header: { alignItems: 'center', paddingTop: spacing.sm, gap: 2 },
  headerSummary: { textAlign: 'center' },
  search: {
    minHeight: MIN_TOUCH_TARGET,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: border.hairline,
    borderRadius: radius.button,
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
  },
  notice: { marginTop: spacing.xs },
  list: { paddingTop: spacing.md, gap: spacing.md },
  section: { gap: spacing.xs },
  empty: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.xs },
  // En proportion de l'écran plutôt qu'une taille fixe : à 160 elle se
  // perdait dans l'espace vide. Plafonnée pour ne pas déborder sur un iPad.
  // Ratio de l'image source (342×326), quasi carrée.
  emptyIllustration: {
    width: '72%',
    maxWidth: 280,
    aspectRatio: 342 / 326,
    marginBottom: spacing.sm,
  },
  emptyTitle: { textAlign: 'center' },
  emptyBody: { textAlign: 'center' },
  emptyAdd: { marginTop: spacing.sm, alignSelf: 'stretch' },
});
