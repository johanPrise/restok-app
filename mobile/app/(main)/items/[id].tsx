import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useDeleteItem, useItemHistory, useItems } from '@/api/items';
import { BackLink } from '@/components/BackLink';
import { Button } from '@/components/Button';
import { ReceiptHistory } from '@/components/ReceiptHistory';
import { Screen } from '@/components/Screen';
import { SwipeableStockTag } from '@/components/SwipeableStockTag';
import { TagSkeleton } from '@/components/TagSkeleton';
import { Text } from '@/components/Text';
import { useGoBack } from '@/lib/useGoBack';
import { useItemActions } from '@/lib/useItemActions';
import { useSession } from '@/store/session';
import { spacing } from '@/theme';
import type { Item } from '@/types/api';

/**
 * Détail d'un item (§5) : le tag en grand, ses deux actions en clair, puis
 * l'historique en ticket de caisse.
 *
 * L'item est lu dans la liste plutôt que par une requête dédiée — le backend
 * n'expose pas `GET /items/:id`. Ce n'est pas un trou : `useItems` partage la
 * clé de cache de l'étagère, donc un écran ouvert à froid déclenche la même
 * requête et retrouve l'item.
 */
export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useGoBack();
  const items = useItems();

  const item = items.data?.find((candidate) => candidate.id === id);

  return (
    <Screen>
      <BackLink onPress={goBack} />

      {items.isPending && <TagSkeleton />}

      {!items.isPending && item === undefined && (
        <View style={styles.missing}>
          <Text variant="body" color="inkSoft">
            Item introuvable — il a peut-être été supprimé.
          </Text>
        </View>
      )}

      {item !== undefined && <Loaded item={item} />}
    </Screen>
  );
}

function Loaded({ item }: Readonly<{ item: Item }>) {
  const goBack = useGoBack();
  const history = useItemHistory(item.id);
  const actions = useItemActions(item);
  const isAdmin = useSession((s) => s.member?.role) === 'admin';

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Mêmes gestes que sur l'étagère, mais sans décrochage : ici le tag n'a
          aucune section où partir. */}
      <SwipeableStockTag item={item} unhookOnEmpty={false} />

      <View style={styles.actions}>
        <Button
          label="J'en ai pris"
          onPress={() => actions.take()}
          disabled={!actions.canTake}
          loading={actions.busy}
          style={styles.action}
        />
        <Button
          label="J'ai racheté"
          variant="secondary"
          onPress={() => actions.restock()}
          loading={actions.busy}
          style={styles.action}
        />
      </View>

      {actions.failed && (
        <Text variant="caption" color="rustClay">
          L&apos;action n&apos;est pas passée. Vérifie ta connexion et réessaie.
        </Text>
      )}

      <View style={styles.section}>
        <Text variant="monoLabel" color="inkSoft">
          Historique
        </Text>
        <ReceiptHistory
          entries={history.data ?? []}
          loading={history.isPending}
        />
      </View>

      {isAdmin && <DeleteItem itemId={item.id} onDeleted={goBack} />}
    </ScrollView>
  );
}

/**
 * Suppression en deux temps plutôt qu'une `Alert` : la boîte native n'existe
 * pas sur web, et un bouton qui se transforme en confirmation reste sous le
 * pouce au lieu de sauter au milieu de l'écran.
 */
function DeleteItem({
  itemId,
  onDeleted,
}: Readonly<{ itemId: string; onDeleted: () => void }>) {
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteItem();

  if (!confirming) {
    return (
      <Button
        label="Supprimer l'item"
        variant="secondary"
        onPress={() => setConfirming(true)}
        style={styles.danger}
      />
    );
  }

  return (
    <View style={styles.danger}>
      <Text variant="caption" color="inkSoft">
        L&apos;item disparaît de l&apos;étagère. Son historique, lui, reste au
        tableau.
      </Text>
      <View style={styles.actions}>
        <Button
          label="Annuler"
          variant="secondary"
          onPress={() => setConfirming(false)}
          style={styles.action}
        />
        <Button
          label="Supprimer"
          variant="danger"
          loading={remove.isPending}
          onPress={() => remove.mutate(itemId, { onSuccess: onDeleted })}
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl, gap: spacing.md },
  missing: { flex: 1, justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: spacing.xs },
  action: { flex: 1 },
  section: { marginTop: spacing.sm, gap: spacing.xs },
  danger: { marginTop: spacing.lg, gap: spacing.xs },
});
