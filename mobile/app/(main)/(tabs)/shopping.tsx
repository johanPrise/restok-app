import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useItems } from '@/api/items';
import { useIsOnline } from '@/api/network';
import {
  useAddShoppingLine,
  useCompleteShopping,
  useRefillShopping,
  useRemoveShoppingLine,
  useSetShoppingLineQuantity,
  useShoppingList,
  useToggleShoppingLine,
} from '@/api/shopping';
import { Button } from '@/components/Button';
import { Hint } from '@/components/Hint';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { ShoppingRow } from '@/components/ShoppingRow';
import { TagCard } from '@/components/TagCard';
import { TagSkeleton } from '@/components/TagSkeleton';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { BasketIcon } from '@/components/icons';
import { useT } from '@/i18n/useT';
import { apiErrorMessage, latestFailure } from '@/lib/api-error';
import { useHint } from '@/lib/useHint';
import { useSession } from '@/store/session';
import { completeBlockedReason, offlineNotice } from '@/lib/offline';
import { useIsSolo } from '@/lib/useIsSolo';
import { useLocale } from '@/i18n/useT';
import { usePendingGestures } from '@/lib/usePendingGestures';
import {
  checkedCount,
  checkedSummary,
  missingFromList,
  splitLines,
  suggestedQuantity,
  suggestItems,
} from '@/lib/shopping-list';
import { withUnit } from '@/lib/units';
import type { Item, ShoppingLine } from '@/types/api';
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
  const online = useIsOnline();
  const toast = useToast();
  const solo = useIsSolo();
  const t = useT();
  const locale = useLocale();
  const hint = useHint('shopping');
  const [managing, setManaging] = useState(false);
  const markLearned = useSession((state) => state.markLearned);
  // Répartis par garantie : ce qui repartira seul, et ce qui ne survivrait pas
  // à une fermeture de l'app.
  const pending = usePendingGestures();
  const [draft, setDraft] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // Une seule ligne en correction à la fois : deux compteurs ouverts, et on ne
  // sait plus lequel on ajuste.
  const [editingId, setEditingId] = useState<string | null>(null);

  const add = useAddShoppingLine();
  const toggle = useToggleShoppingLine();
  const remove = useRemoveShoppingLine();
  const setQuantity = useSetShoppingLineQuantity();
  const refill = useRefillShopping();
  const complete = useCompleteShopping();

  const lines = useMemo(() => shopping.data ?? [], [shopping.data]);
  const { fromShelf, free } = useMemo(() => splitLines(lines), [lines]);
  const checked = checkedCount(lines);
  const missing = missingFromList(items.data ?? [], lines);

  /**
   * Un geste qui échoue doit le dire. Cocher est *optimiste* : la ligne se
   * décoche toute seule au refus du serveur, et sans ce message on croirait à
   * un bug de l'appli plutôt qu'à un appel refusé.
   */
  const failure = latestFailure([
    add,
    toggle,
    remove,
    setQuantity,
    refill,
    complete,
  ], locale);

  const notice = offlineNotice(online, pending.durable, pending.volatile, locale);
  const blocked = completeBlockedReason(online, locale);

  const label = draft.trim();
  const canAdd = label.length >= MIN_LABEL;
  const suggestions = suggestItems(items.data ?? [], lines, draft);

  const submit = () => {
    if (!canAdd) return;
    setDraft('');
    add.mutate(
      { label },
      { onSuccess: () => toast(t('courses.ajouteAuxCourses', { nom: label })) },
    );
  };

  /**
   * Rattacher plutôt que dupliquer : une ligne libre « Café » disparaîtrait à
   * la validation sans rien remettre en stock.
   */
  const addFromShelf = (item: Item) => {
    setDraft('');
    add.mutate(
      { itemId: item.id, quantity: suggestedQuantity(item) },
      {
        onSuccess: () =>
          toast(t('courses.ajouteAuxCourses', { nom: item.name })),
      },
    );
  };

  const commitQuantity = (line: ShoppingLine, units: number) => {
    setEditingId(null);
    if (units !== line.quantity)
      setQuantity.mutate(
        { id: line.id, quantity: units },
        {
          onSuccess: () =>
            toast(t('courses.quantiteCorrigee', { nom: line.name })),
        },
      );
  };

  const confirmRemove = (line: ShoppingLine) =>
    Alert.alert(line.name, t('courses.retirerTitre'), [
      { text: t('courses.annuler'), style: 'cancel' },
      {
        text: t('courses.retirer'),
        style: 'destructive',
        onPress: () =>
          remove.mutate(line.id, {
            onSuccess: () =>
              toast(t('courses.retireDeLaListe', { nom: line.name })),
          }),
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
              solo={solo}
              managing={managing}
              onToggle={() =>
                toggle.mutate({ id: line.id, checked: !line.checked })
              }
              onRemove={() => confirmRemove(line)}
              editing={editingId === line.id}
              onEdit={() => setEditingId(line.id)}
              onCancelEdit={() => setEditingId(null)}
              onQuantity={(units) => commitQuantity(line, units)}
            />
          ))}
      </View>
    );

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Text variant="display">{t('onglets.courses')}</Text>
        <Text variant="monoLabel" color="inkSoft">
          {shopping.isError ? t('courses.nonChargee') : checkedSummary(lines, locale)}
        </Text>

        {/* Retirer se faisait par appui long, et rien ne le disait. Le mode
            gestion le rend visible sans poser un geste destructeur à demeure
            à côté de la case qu'on coche vingt fois dans un magasin. */}
        {lines.length > 0 && (
          <Button
            label={t(managing ? 'commun.terminer' : 'commun.gerer')}
            variant="secondary"
            onPress={() => setManaging((on) => !on)}
            style={styles.manage}
          />
        )}
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
            message={apiErrorMessage(shopping.error, locale)}
            onRetry={() => void shopping.refetch()}
          />
        )}

        {!shopping.isPending && !shopping.isError && lines.length === 0 && (
          <EmptyState
            missing={missing.length}
            loading={refill.isPending}
            online={online}
            onRefill={() =>
              refill.mutate(undefined, {
                onSuccess: () =>
                  toast(
                    t('courses.verses', { count: missing.length }),
                  ),
              })
            }
          />
        )}

        {/* Hors état vide, l'étagère peut réclamer de nouvelles choses depuis
            le dernier versement — sans ce rappel, on ne pourrait plus les
            récupérer sans avoir d'abord tout acheté. */}
        {lines.length > 0 && missing.length > 0 && (
          <Button
            variant="secondary"
            label={t('courses.recuperer', { count: missing.length })}
            loading={refill.isPending}
            disabled={!online}
            onPress={() =>
              refill.mutate(undefined, {
                onSuccess: () =>
                  toast(
                    t('courses.verses', { count: missing.length }),
                  ),
              })
            }
          />
        )}

        {section('shelf', t('courses.depuisEtagere'), fromShelf)}
        {section('free', t('courses.ajoutsLibres'), free)}
      </ScrollView>

      {/* Les deux actions restent sous le pouce quelle que soit la longueur de
          la liste : au magasin, on ne fait pas défiler pour valider. */}
      <View style={[styles.footer, { borderTopColor: colors.thread }]}>
        {/* Le hors-ligne passe avant l'erreur : un geste qui échoue parce que
            le réseau est coupé n'a pas à se raconter deux fois. */}
        {notice !== null && (
          <Text variant="caption" color="inkSoft">
            {notice}
          </Text>
        )}

        {notice === null && failure !== null && (
          <Text variant="caption" color="rustClay">
            {failure}
          </Text>
        )}

        {/* Au-dessus du champ, pas en dessous : le clavier occupe le bas. */}
        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {suggestions.map((item) => (
              <Suggestion
                key={item.id}
                item={item}
                onPress={() => addFromShelf(item)}
              />
            ))}
          </View>
        )}

        <View style={styles.addRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submit}
            placeholder={t('courses.ajouterArticle')}
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
            label={t('courses.ajouter')}
            disabled={!canAdd}
            loading={add.isPending}
            onPress={submit}
          />
        </View>

        {/* Juste au-dessus du bouton qu'il explique : la clôture est le seul
            geste de l'app dont l'effet se produit sur un autre écran, et rien
            ne le disait avant qu'on appuie. */}
        {hint !== null && <Hint id={hint} />}

        {/* Répondre au « pourquoi est-il gris ? », et seulement quand la
            question se pose — c'est-à-dire quand il y a de quoi valider. */}
        {blocked !== null && checked > 0 && (
          <Text variant="caption" color="inkSoft">
            {blocked}
          </Text>
        )}

        <Button
          label={t('courses.faitLesCourses')}
          disabled={checked === 0 || blocked !== null}
          loading={complete.isPending}
          // La liste se vide sous les yeux, mais ce qui compte s'est passé
          // ailleurs : le stock est remonté et le journal l'a enregistré.
          onPress={() =>
            complete.mutate(undefined, {
              onSuccess: () => {
                // La boucle vient d'être bouclée sous ses yeux : le repère qui
                // l'annonçait n'a plus rien à annoncer.
                void markLearned('shoppingLoop');
                toast(t('courses.rachatsEnregistres', { count: checked }));
              },
            })
          }
        />
      </View>
    </Screen>
  );
}

/**
 * Un item de l'étagère proposé pendant la frappe. Il annonce ce qu'il ajoutera
 * — sinon on ne saurait pas ce qui distingue ce choix du texte qu'on tape.
 */
function Suggestion({
  item,
  onPress,
}: Readonly<{ item: Item; onPress: () => void }>) {
  const { colors } = useTheme();
  const t = useT();
  const units = suggestedQuantity(item);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('courses.ajouterDepuisEtagere', {
        nom: item.name,
      })}
      onPress={onPress}
      style={[
        styles.suggestion,
        { backgroundColor: colors.paperRaised, borderColor: colors.thread },
      ]}
    >
      <BasketIcon color={colors.inkSoft} size={14} />
      <Text variant="body" numberOfLines={1} style={styles.suggestionName}>
        {item.name}
      </Text>
      {units !== undefined && (
        <Text variant="mono" color="inkSoft">
          {withUnit(item, units)}
        </Text>
      )}
    </Pressable>
  );
}

function EmptyState({
  missing,
  loading,
  online,
  onRefill,
}: Readonly<{
  missing: number;
  loading: boolean;
  online: boolean;
  onRefill: () => void;
}>) {
  const t = useT();
  return (
    <TagCard style={styles.empty}>
      <Text variant="tagName" color="inkSoft" style={styles.centered}>
        {t('courses.rienAAcheter')}
      </Text>
      <Text variant="body" color="inkSoft" style={styles.centered}>
        {missing > 0
          ? t('courses.etagereReclame')
          : t('courses.ajouteOuReviens')}
      </Text>
      {/* Sans rien à verser, le bouton ne ferait rien : on ne le montre pas
          plutôt que de le montrer inerte. */}
      {missing > 0 && (
        <Button
          variant="secondary"
          label={t('courses.recupererTout')}
          loading={loading}
          // Le versement se calcule côté serveur, sur l'état du stock à
          // l'instant de l'appel : il n'y a rien à mettre en file.
          disabled={!online}
          onPress={onRefill}
          style={styles.emptyAction}
        />
      )}
    </TagCard>
  );
}

function ErrorState({
  message,
  onRetry,
}: Readonly<{ message: string; onRetry: () => void }>) {
  const t = useT();
  return (
    <View style={styles.error}>
      <Text variant="tagName" color="rustClay" style={styles.centered}>
        {t('courses.indisponible')}
      </Text>
      <Text variant="body" color="inkSoft" style={styles.centered}>
        {message}
      </Text>
      <Button label={t('courses.reessayer')} onPress={onRetry} style={styles.emptyAction} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingTop: spacing.sm, gap: 2 },
  manage: { marginTop: spacing.xs, paddingHorizontal: spacing.md },
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
  suggestions: { gap: spacing.xs },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm,
    borderWidth: border.hairline,
    borderRadius: radius.button,
  },
  suggestionName: { flex: 1 },
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
