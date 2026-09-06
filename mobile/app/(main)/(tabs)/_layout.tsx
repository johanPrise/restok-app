import { usePathname, useRouter } from 'expo-router';
import { TabList, TabSlot, Tabs, TabTrigger } from 'expo-router/ui';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fab } from '@/components/Fab';
import { TabBarButton } from '@/components/TabBarButton';
import { useT } from '@/i18n/useT';
import {
  BasketIcon,
  JournalIcon,
  RecipeIcon,
  SettingsIcon,
  ShelfIcon,
} from '@/components/icons';
import { useIsAssociation } from '@/lib/useIsAssociation';
import { useSession } from '@/store/session';
import { border, spacing, tabBar, useTheme } from '@/theme';

/**
 * Barre du bas, d'après le Figma exporté du produit : ancrée dans le flux
 * normal, pas en survol — un aplat `raised`, un fil `rule` en haut,
 * aucun rayon, aucune ombre. L'onglet actif ne se distingue que par la couleur
 * de son icône et de son libellé, rien d'autre : pas de pastille, pas de fond,
 * pas de halo.
 *
 * N'étant pas en survol, elle n'occupe pas la couche « chrome flottante » —
 * voir l'extension du §3 dans `theme/layout` — donc aucun écran n'a besoin de
 * lui réserver de place : `TabSlot` s'arrête naturellement au-dessus d'elle.
 *
 * On passe par les `Tabs` sans habillage d'`expo-router/ui` plutôt que par le
 * navigateur classique : la barre est trop dessinée pour les options du
 * `bottom-tabs` de React Navigation.
 *
 * **Quatre onglets, ou cinq en association.** La maquette s'arrêtait à quatre ;
 * le journal est le cinquième, et c'est ce que ce mode a de plus. D'où la
 * structure en deux temps : un `TabList` caché qui déclare les cinq routes une
 * fois pour toutes, et une barre visible, ordinaire, qui en montre quatre ou
 * cinq. Un `TabTrigger` hors de `TabList` n'a pas besoin de `href` — il
 * désigne une route déjà déclarée.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  // Le backend refuse la création d'item à un simple membre (403) : lui
  // proposer le bouton serait promettre une action qui échouera.
  const isAdmin = useSession((s) => s.member?.role) === 'admin';
  // Le journal n'a un onglet qu'en association : c'est là que « qu'a sorti
  // untel, depuis quand » est une question qu'on pose, et la seule chose que
  // ce mode change aujourd'hui.
  const isAssociation = useIsAssociation();
  const t = useT();
  // Ailleurs qu'en association, l'onglet n'est pas proposé — mais la route
  // existe, donc une adresse tapée à la main y mène. Sans cette seconde
  // condition, la barre allumait « Inventaire » pendant qu'on lisait le
  // journal : elle mentait sur l'endroit où l'on se trouve. Elle montre donc
  // l'onglet dès qu'il est l'écran courant, quel que soit le mode.
  const showJournal = isAssociation || pathname === '/journal';

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
                  ? 'Chercher une recette'
                  : 'Ajouter un item'
              }
              onPress={() =>
                router.push(
                  pathname === '/recipes' ? '/recipes/browse' : '/items/new',
                )
              }
            />
          </View>
        )}
      </View>

      {/* La barre visible. Les `TabTrigger` posés hors de `TabList` n'ont pas
          besoin de `href` : ils désignent une route déjà déclarée plus bas. */}
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.raised,
            borderTopColor: colors.rule,
            // La hauteur totale cumule la hauteur utile des onglets et l'encoche
            // système / barre de navigation de l'appareil.
            height: tabBar.height + insets.bottom,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <TabTrigger name="shelf" asChild>
          <TabBarButton
            icon={ShelfIcon}
            label={t('onglets.inventaire')}
            compact={showJournal}
          />
        </TabTrigger>
        <TabTrigger name="shopping" asChild>
          <TabBarButton
            icon={BasketIcon}
            label={t('onglets.courses')}
            compact={showJournal}
          />
        </TabTrigger>
        <TabTrigger name="recipes" asChild>
          <TabBarButton
            icon={RecipeIcon}
            label={t('onglets.recettes')}
            compact={showJournal}
          />
        </TabTrigger>
        {showJournal && (
          <TabTrigger name="journal" asChild>
            <TabBarButton
              icon={JournalIcon}
              label={t('onglets.journal')}
              compact={showJournal}
            />
          </TabTrigger>
        )}
        <TabTrigger name="settings" asChild>
          <TabBarButton
            icon={SettingsIcon}
            label={t('onglets.parametres')}
            compact={showJournal}
          />
        </TabTrigger>
      </View>

      {/* Les routes, déclarées une fois pour toutes et jamais masquées.
          C'est en parcourant `TabList` qu'expo-router les découvre : y faire
          apparaître et disparaître le journal au gré du type de groupe
          reviendrait à recomposer le navigateur pendant qu'on s'en sert. On
          déclare donc les cinq, et c'est la **barre** qui en montre quatre ou
          cinq. Conséquence assumée : en colocation, l'adresse du journal reste
          joignable — le serveur l'ouvre déjà à tous les membres, et inventer
          ici un refus que le domaine ne pose pas serait une règle de plus à
          défendre pour rien. */}
      <TabList style={styles.hidden}>
        <TabTrigger name="shelf" href="/shelf" />
        <TabTrigger name="shopping" href="/shopping" />
        <TabTrigger name="recipes" href="/recipes" />
        <TabTrigger name="journal" href="/journal" />
        <TabTrigger name="settings" href="/settings" />
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
  fabSlot: { position: 'absolute', right: spacing.card, bottom: spacing.card },
  // `TabList` doit être rendu pour que les routes existent, pas affiché.
  hidden: { display: 'none' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.hair,
    borderTopWidth: border.hairline,
  },
});
