import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useDeleteItem, useItemHistory, useItems } from '@/api/items';
import { BackLink } from '@/components/BackLink';
import { Button } from '@/components/Button';
import { ProductFormat } from '@/components/ProductFormat';
import { QuantityStepper } from '@/components/QuantityStepper';
import { ReceiptHistory } from '@/components/ReceiptHistory';
import { Screen } from '@/components/Screen';
import { SwipeableStockTag } from '@/components/SwipeableStockTag';
import { TagSkeleton } from '@/components/TagSkeleton';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { useGoBack } from '@/lib/useGoBack';
import {
  defaultRestockPacks,
  hasPacks,
  packSummary,
  unitsInPacks,
  withUnit,
} from '@/lib/units';
import { useItemActions, type ItemActions } from '@/lib/useItemActions';
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

      <ItemActionsPanel item={item} actions={actions} />

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

      {isAdmin && (
        <DeleteItem itemId={item.id} name={item.name} onDeleted={goBack} />
      )}
    </ScrollView>
  );
}

/**
 * Le balayage plafonne à quelques unités, parce qu'au-delà le geste devient
 * pénible. Cet écran est justement le chemin précis : il ne reprend pas cette
 * limite, seulement une borne raisonnable contre la faute de frappe.
 */
const MAX_RESTOCK_UNITS = 99;

/**
 * Les deux actions, avec leur quantité.
 *
 * C'est ici que se dit le combien exact — le balayage exprime des unités par
 * crans, ce qui va vite mais plafonne. En suivi binaire il n'y a rien à
 * compter : les boutons restent seuls.
 *
 * Les valeurs de départ ne sont pas neutres : une prise vaut une unité, un
 * rachat propose de quoi refaire le plein. C'est ce qu'on fait le plus souvent.
 */
function ItemActionsPanel({
  item,
  actions,
}: Readonly<{ item: Item; actions: ItemActions }>) {
  const counts = item.trackingType === 'quantity';
  const [taking, setTaking] = useState(1);
  /**
   * Tant que personne n'y touche, le rachat suit le stock : après une prise,
   * « refaire le plein » ne veut plus dire la même chose. Une valeur figée au
   * montage proposait de racheter ce qui manquait *avant* l'action.
   */
  const [chosen, setChosen] = useState<number | null>(null);
  // Compté en paquets quand l'item s'achète par lot — c'est l'unité dans
  // laquelle on revient du magasin. Converti juste avant l'appel.
  const buyingPacks = chosen ?? defaultRestockPacks(item);

  if (!counts) {
    return (
      <View style={styles.panel}>
        <View style={styles.actions}>
          {/* « J'en ai pris » serait un mensonge ici : en suivi de présence,
              une prise signale la rupture, pas une unité de moins. */}
          <Button
            label="J'ai pris le dernier"
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
        <ProductFormat item={item} />
      </View>
    );
  }

  const stock = item.quantity ?? 0;

  return (
    <View style={styles.panel}>
      <View style={styles.actions}>
        <QuantityStepper
          label="Unités prises"
          value={Math.min(taking, Math.max(stock, 1))}
          onChange={setTaking}
          max={Math.max(stock, 1)}
        />
        <Button
          label="J'en ai pris"
          onPress={() => actions.take({ units: Math.min(taking, stock) })}
          disabled={!actions.canTake}
          loading={actions.busy}
          style={styles.action}
        />
      </View>

      <View style={styles.actions}>
        <QuantityStepper
          label={hasPacks(item) ? 'Paquets rachetés' : 'Unités rachetées'}
          value={buyingPacks}
          onChange={setChosen}
          max={MAX_RESTOCK_UNITS}
        />
        <Button
          label="J'ai racheté"
          variant="secondary"
          onPress={() =>
            actions.restock({ units: unitsInPacks(item, buyingPacks) })
          }
          loading={actions.busy}
          style={styles.action}
        />
      </View>

      {/* L'étiquette se donne ici, au retour des courses : c'est le seul
          moment où on a le produit en main. */}
      <ProductFormat item={item} />

      {/* Un compteur de lots est ambigu tant qu'on ne dit pas ce qu'il y a
          dedans. */}
      {packSummary(item, buyingPacks) !== null && (
        <Text variant="caption" color="pantryTeal">
          {packSummary(item, buyingPacks)}
        </Text>
      )}

      <Text variant="caption" color="inkSoft">
        {withUnit(item, stock)} en stock
        {item.targetQuantity
          ? ` · ${item.targetQuantity} quand c'est plein`
          : ''}
      </Text>
    </View>
  );
}

/**
 * Suppression en deux temps plutôt qu'une `Alert` : la boîte native n'existe
 * pas sur web, et un bouton qui se transforme en confirmation reste sous le
 * pouce au lieu de sauter au milieu de l'écran.
 */
function DeleteItem({
  itemId,
  name,
  onDeleted,
}: Readonly<{ itemId: string; name: string; onDeleted: () => void }>) {
  const toast = useToast();
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
          onPress={() =>
            remove.mutate(itemId, {
              onSuccess: () => {
                toast(`${name} supprimé de l’étagère`);
                onDeleted();
              },
            })
          }
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl, gap: spacing.md },
  missing: { flex: 1, justifyContent: 'center' },
  panel: { gap: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  action: { flex: 1 },
  section: { marginTop: spacing.sm, gap: spacing.xs },
  danger: { marginTop: spacing.lg, gap: spacing.xs },
});
