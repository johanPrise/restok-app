import { usePathname, useRouter } from 'expo-router';
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
import { border, spacing, tabBar, useTheme } from '@/theme';

/**
 * Barre du bas à quatre onglets, d'après le Figma exporté du produit : ancrée
 * dans le flux normal, pas en survol — un aplat `paperRaised`, un fil `thread`
 * en haut, aucun rayon, aucune ombre. L'onglet actif ne se distingue que par
 * la couleur de son icône et de son libellé, rien d'autre : pas de pastille,
 * pas de fond, pas de halo.
 *
 * N'étant pas en survol, elle n'occupe pas la couche « chrome flottante » —
 * voir l'extension du §3 dans `theme/layout` — donc aucun écran n'a besoin de
 * lui réserver de place : `TabSlot` s'arrête naturellement au-dessus d'elle.
 *
 * On passe par les `Tabs` sans habillage d'`expo-router/ui` plutôt que par le
 * navigateur classique : la barre est trop dessinée pour les options du
 * `bottom-tabs` de React Navigation.
 *
 * `<TabList>` doit rester un enfant direct de `<Tabs>` — c'est en le parcourant
 * qu'expo-router découvre les routes. Avec `asChild`, le parseur sait descendre
 * dans l'enfant unique, ce qui permet de lui donner la surface pleine.
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

        {/* Les recettes sont ouvertes à tous : le bouton n'y est pas réservé
            aux admins, contrairement à l'étagère. */}
        {(pathname === '/recipes' || (pathname === '/shelf' && isAdmin)) && (
          // La barre ne flotte plus au-dessus du contenu, mais le FAB, lui,
          // continue de le faire : `bottom` reste un simple espacement fixe,
          // plus besoin de calculer la hauteur d'une barre qui n'est plus là.
          <View style={styles.fabSlot} pointerEvents="box-none">
            <Fab
              accessibilityLabel={
                pathname === '/recipes'
                  ? 'Ajouter une recette'
                  : 'Ajouter un item'
              }
              onPress={() =>
                router.push(
                  pathname === '/recipes' ? '/recipes/new' : '/items/new',
                )
              }
            />
          </View>
        )}
      </View>

      <TabList asChild>
        {/* `style` doit être un objet **plat** : `asChild` passe par un Slot qui
            fusionne les styles à l'étalement, et un tableau y devient un objet
            à clés numériques que react-native-web ne sait pas appliquer. */}
        <View
          style={StyleSheet.flatten([
            styles.bar,
            {
              backgroundColor: colors.paperRaised,
              borderTopColor: colors.thread,
              // La zone de gestes / l'encoche du bas fait partie de la barre,
              // pas du contenu au-dessus — elle n'a donc pas à être réservée
              // ailleurs.
              paddingBottom: insets.bottom,
            },
          ])}
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
        </View>
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
  fabSlot: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: tabBar.height,
    paddingHorizontal: 6,
    borderTopWidth: border.hairline,
  },
});
