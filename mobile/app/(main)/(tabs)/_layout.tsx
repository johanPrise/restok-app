import { useRouter, usePathname } from 'expo-router';
import { TabList, TabSlot, Tabs, TabTrigger } from 'expo-router/ui';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fab } from '@/components/Fab';
import { TabBarButton } from '@/components/TabBarButton';
import {
  BasketIcon,
  RecipeIcon,
  SettingsIcon,
  ShelfIcon,
} from '@/components/icons';
import { useSession } from '@/store/session';
import { border, spacing, useTheme } from '@/theme';

/**
 * Barre du bas à quatre onglets. On passe par les `Tabs` sans habillage
 * d'`expo-router/ui` plutôt que par le navigateur classique : la maquette
 * dessine une pastille teal autour de l'onglet actif, que les options du
 * `bottom-tabs` de React Navigation n'exposent pas.
 *
 * `<TabList>` doit rester un enfant direct de `<Tabs>` — c'est en le parcourant
 * qu'expo-router découvre les routes. `<TabSlot>`, lui, peut être emballé : on
 * l'enveloppe pour poser le FAB par-dessus l'écran sans qu'il flotte aussi
 * au-dessus de la barre.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  // Le backend refuse la création d'item à un simple membre (403) : lui
  // proposer le bouton serait promettre une action qui échouera.
  const isAdmin = useSession((s) => s.member?.role) === 'admin';

  return (
    <Tabs style={[styles.root, { backgroundColor: colors.paper }]}>
      <View style={styles.body}>
        {/* `TabSlot` se dimensionne par défaut sur son contenu et refuse de
            rétrécir (`flexShrink: 0`, base `auto`). Un écran plus haut que la
            fenêtre débordait donc au lieu de laisser défiler sa liste : on lui
            impose la hauteur disponible. */}
        <TabSlot style={styles.slot} />
        {pathname === '/shelf' && isAdmin && (
          <View style={styles.fabSlot} pointerEvents="box-none">
            <Fab
              accessibilityLabel="Ajouter un item"
              onPress={() => router.push('/items/new')}
            />
          </View>
        )}
      </View>

      <TabList
        style={[
          styles.bar,
          {
            backgroundColor: colors.paperRaised,
            borderTopColor: colors.thread,
            // L'encoche du bas appartient à la barre : les écrans d'onglet
            // s'arrêtent donc au-dessus d'elle (`edges` sans `bottom`).
            paddingBottom: spacing.sm + insets.bottom,
          },
        ]}
      >
        <TabTrigger name="shelf" href="/shelf" asChild>
          <TabBarButton icon={ShelfIcon} label="Inventaire" />
        </TabTrigger>
        <TabTrigger name="shopping" href="/shopping" asChild>
          <TabBarButton icon={BasketIcon} label="Courses" />
        </TabTrigger>
        <TabTrigger name="recipes" href="/recipes" asChild>
          <TabBarButton icon={RecipeIcon} label="Recettes" />
        </TabTrigger>
        <TabTrigger name="settings" href="/settings" asChild>
          <TabBarButton icon={SettingsIcon} label="Paramètres" />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // `Tabs` étale sa propre `style` avant celle qu'on lui passe : sans `flex: 1`
  // explicite ici, on écrase le sien et la barre remonte en haut de l'écran.
  root: { flex: 1 },
  body: { flex: 1 },
  slot: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  fabSlot: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.md,
  },
  bar: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: border.hairline,
    alignItems: 'center',
  },
});
