import { useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { ApiError } from '@/api/client';
import { useItems } from '@/api/items';
import {
  useAddShoppingLine,
  useCompleteShopping,
  useRefillShopping,
  useRemoveShoppingLine,
  useShoppingList,
  useToggleShoppingLine,
} from '@/api/shopping';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { ShoppingRow } from '@/components/ShoppingRow';
import { TagCard } from '@/components/TagCard';
import { TagSkeleton } from '@/components/TagSkeleton';
import { Text } from '@/components/Text';
import {
  checkedCount,
  checkedSummary,
  missingFromList,
  splitLines,
} from '@/lib/shopping-list';
import type { ShoppingLine } from '@/types/api';
import {
  border,
  fontFamily,
  fontSize,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  useTheme,
} from '@/theme';

/** Le backend refuse un texte libre en dessous de deux caractères. */
const MIN_LABEL = 2;

export default function Shopping() {
  const { colors } = useTheme();
  const shopping = useShoppingList();
  const items = useItems();
  const [draft, setDraft] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const add = useAddShoppingLine();
  const toggle = useToggleShoppingLine();
  const remove = useRemoveShoppingLine();
  const refill = useRefillShopping();
  const complete = useCompleteShopping();

  const lines = useMemo(() => shopping.data ?? [], [shopping.data]);
  const { fromShelf, free } = useMemo(() => splitLines(lines), [lines]);
  const checked = checkedCount(lines);
  const missing = missingFromList(items.data ?? [], lines);

  const label = draft.trim();
  const canAdd = label.length >= MIN_LABEL;

  const submit = () => {
    if (!canAdd) return;
    setDraft('');
    add.mutate({ label });
  };

  const confirmRemove = (line: ShoppingLine) =>
    Alert.alert(line.name, 'Retirer de la liste ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: () => remove.mutate(line.id),
      },
    ]);

  const section = (key: string, title: string, sectionLines: ShoppingLine[]) =>
    sectionLines.length > 0 && (
      <View key={key} style={styles.section}>
        <SectionHeader
          title={title}
          count={sectionLines.length}
          color="inkSoft"
          collapsed={collapsed[key] ?? false}
          onToggle={() =>
            setCollapsed((state) => ({ ...state, [key]: !state[key] }))
          }
        />
        {!collapsed[key] &&
          sectionLines.map((line) => (
            <ShoppingRow
              key={line.id}
              line={line}
              onToggle={() =>
                toggle.mutate({ id: line.id, checked: !line.checked })
              }
              onRemove={() => confirmRemove(line)}
            />
          ))}
      </View>
    );

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Text variant="display">Courses</Text>
        <Text variant="monoLabel" color="inkSoft">
          {shopping.isError ? 'Liste indisponible' : checkedSummary(lines)}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={shopping.isRefetching}
            onRefresh={() => void shopping.refetch()}
            tintColor={colors.pantryTeal}
          />
        }
      >
        {shopping.isPending &&
          Array.from({ length: 3 }, (_, index) => <TagSkeleton key={index} />)}

        {/* Une liste vide et un serveur injoignable ne demandent pas la même
            chose : la première propose de la remplir, le second de réessayer. */}
        {shopping.isError && (
          <ErrorState
            message={networkErrorMessage(shopping.error)}
            onRetry={() => void shopping.refetch()}
          />
        )}

        {!shopping.isPending && !shopping.isError && lines.length === 0 && (
          <EmptyState
            missing={missing.length}
            loading={refill.isPending}
            onRefill={() => refill.mutate()}
          />
        )}

        {/* Hors état vide, l'étagère peut réclamer de nouvelles choses depuis
            le dernier versement — sans ce rappel, on ne pourrait plus les
            récupérer sans avoir d'abord tout acheté. */}
        {lines.length > 0 && missing.length > 0 && (
          <Button
            variant="secondary"
            label={`Récupérer ${missing.length} item${missing.length > 1 ? 's' : ''} à racheter`}
            loading={refill.isPending}
            onPress={() => refill.mutate()}
          />
        )}

        {section('shelf', 'Depuis l’étagère', fromShelf)}
        {section('free', 'Ajouts libres', free)}
      </ScrollView>

      {/* Les deux actions restent sous le pouce quelle que soit la longueur de
          la liste : au magasin, on ne fait pas défiler pour valider. */}
      <View style={[styles.footer, { borderTopColor: colors.thread }]}>
        <View style={styles.addRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submit}
            placeholder="Ajouter un article"
            placeholderTextColor={colors.inkSoft}
            returnKeyType="done"
            maxLength={100}
            style={[
              styles.input,
              {
                backgroundColor: colors.paperRaised,
                borderColor: colors.thread,
                color: colors.ink,
              },
            ]}
          />
          <Button
            variant="secondary"
            label="Ajouter"
            disabled={!canAdd}
            loading={add.isPending}
            onPress={submit}
          />
        </View>

        <Button
          label="J’ai fait les courses"
          disabled={checked === 0}
          loading={complete.isPending}
          onPress={() => complete.mutate()}
        />
      </View>
    </Screen>
  );
}

function EmptyState({
  missing,
  loading,
  onRefill,
}: Readonly<{ missing: number; loading: boolean; onRefill: () => void }>) {
  return (
    <TagCard style={styles.empty}>
      <Text variant="tagName" color="inkSoft" style={styles.centered}>
        Rien à acheter
      </Text>
      <Text variant="body" color="inkSoft" style={styles.centered}>
        {missing > 0
          ? 'L’étagère réclame déjà des choses : verse-les ici.'
          : 'Ajoute un article, ou reviens quand un stock baisse.'}
      </Text>
      {/* Sans rien à verser, le bouton ne ferait rien : on ne le montre pas
          plutôt que de le montrer inerte. */}
      {missing > 0 && (
        <Button
          variant="secondary"
          label="Récupérer ce qui est à racheter"
          loading={loading}
          onPress={onRefill}
          style={styles.emptyAction}
        />
      )}
    </TagCard>
  );
}

/**
 * `ApiError` porte un message du backend, lisible tel quel. Toute autre erreur
 * vient de `fetch` lui-même, jamais du serveur.
 */
function networkErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;

  return "Le serveur ne répond pas. Vérifie qu'il est bien démarré.";
}

function ErrorState({
  message,
  onRetry,
}: Readonly<{ message: string; onRetry: () => void }>) {
  return (
    <View style={styles.error}>
      <Text variant="tagName" color="rustClay" style={styles.centered}>
        Connexion impossible
      </Text>
      <Text variant="body" color="inkSoft" style={styles.centered}>
        {message}
      </Text>
      <Button label="Réessayer" onPress={onRetry} style={styles.emptyAction} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingTop: spacing.sm, gap: 2 },
  list: { paddingTop: spacing.md, paddingBottom: spacing.md, gap: spacing.md },
  section: { gap: spacing.xs },
  empty: { gap: spacing.xs, paddingVertical: spacing.lg },
  emptyAction: { marginTop: spacing.sm, alignSelf: 'stretch' },
  error: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.xs },
  centered: { textAlign: 'center' },
  footer: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: border.hairline,
    gap: spacing.sm,
  },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  input: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm,
    borderWidth: border.hairline,
    borderRadius: radius.button,
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
  },
});
