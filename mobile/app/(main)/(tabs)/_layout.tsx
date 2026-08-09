import { usePathname, useRouter } from 'expo-router';
import { TabList, TabSlot, Tabs, TabTrigger } from 'expo-router/ui';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fab } from '@/components/Fab';
import { GlassSurface } from '@/components/GlassSurface';
import { TabBarButton } from '@/components/TabBarButton';
import {
  BasketIcon,
  RecipeIcon,
  SettingsIcon,
  ShelfIcon,
} from '@/components/icons';
import { useTabBarSpace } from '@/lib/useTabBarSpace';
import { useSession } from '@/store/session';
import { spacing, tabBar, useTheme } from '@/theme';

/**
 * Barre du bas à quatre onglets, en verre dépoli.
 *
 * Elle **flotte au-dessus** du contenu au lieu de le pousser : un verre posé
 * sur un aplat uniforme ne montre rien, il lui faut quelque chose à flouter.
 * En contrepartie chaque écran d'onglet réserve sa hauteur — voir
 * `useTabBarSpace`.
 *
 * On passe par les `Tabs` sans habillage d'`expo-router/ui` plutôt que par le
 * navigateur classique : la barre est trop dessinée pour les options du
 * `bottom-tabs` de React Navigation.
 *
 * `<TabList>` doit rester un enfant direct de `<Tabs>` — c'est en le parcourant
 * qu'expo-router découvre les routes. Avec `asChild`, le parseur sait descendre
 * dans l'enfant unique, ce qui permet de lui donner la surface de verre.
 */
export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const space = useTabBarSpace();
  // Le backend refuse la création d'item à un simple membre (403) : lui
  // proposer le bouton serait promettre une action qui échouera.
  const isAdmin = useSession((s) => s.member?.role) === 'admin';

  // Un liseré clair en haut du verre : c'est lui qui donne l'arête, l'illusion
  // d'une plaque posée plutôt que d'un rectangle peint.
  const rim = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.75)';

  return (
    <Tabs style={[styles.root, { backgroundColor: colors.paper }]}>
      <View style={styles.body}>
        {/* `TabSlot` se dimensionne par défaut sur son contenu et refuse de
            rétrécir (`flexShrink: 0`, base `auto`). Un écran plus haut que la
            fenêtre débordait donc au lieu de laisser défiler sa liste : on lui
            impose la hauteur disponible. */}
        <TabSlot style={styles.slot} />

        {pathname === '/shelf' && isAdmin && (
          <View
            style={[styles.fabSlot, { bottom: space + spacing.xs }]}
            pointerEvents="box-none"
          >
            <Fab
              accessibilityLabel="Ajouter un item"
              onPress={() => router.push('/items/new')}
            />
          </View>
        )}
      </View>

      <TabList asChild>
        {/* `style` doit être un objet **plat** : `asChild` passe par un Slot qui
            fusionne les styles à l'étalement, et un tableau y devient un objet
            à clés numériques que react-native-web ne sait pas appliquer. */}
        <GlassSurface
          intensity={48}
          style={StyleSheet.flatten([
            styles.bar,
            {
              borderColor: rim,
              bottom: Math.max(insets.bottom, tabBar.gap),
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
        </GlassSurface>
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
  fabSlot: { position: 'absolute', right: spacing.lg },
  bar: {
    position: 'absolute',
    left: tabBar.inset,
    right: tabBar.inset,
    height: tabBar.height,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderRadius: tabBar.radius,
    borderWidth: 1,
    // La profondeur vient d'ici et non d'un aplat : le verre doit sembler
    // décollé du fond.
    //
    // Material range les composants de navigation au niveau 3 de son échelle
    // d'élévation, soit 4dp d'ombre. On était à 10 : la barre pesait plus lourd
    // qu'une feuille modale, ce qui n'est pas son rang.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});
