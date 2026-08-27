import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { trackNetwork } from '@/api/network';
import { persistOptions } from '@/api/persist';
import { queryClient } from '@/api/query-client';
import { ToastProvider } from '@/components/Toast';
import { useNotificationSync } from '@/lib/useNotificationSync';
import { useLanguage } from '@/store/language';
import { useSession } from '@/store/session';
import { appFonts } from '@/theme/fonts';

// Le splash reste visible tant que les polices ne sont pas prêtes : sans ça
// l'app affiche un premier rendu en police système, puis saute.
void SplashScreen.preventAutoHideAsync();

// Au chargement du module, pas dans un effet : une requête partie avant le
// premier rendu doit déjà savoir s'il y a du réseau.
trackNetwork();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(appFonts);

  const hydrate = useSession((s) => s.hydrate);
  const isHydrated = useSession((s) => s.isHydrated);
  // La langue se relit en même temps que la session, et le splash attend les
  // deux : sans ça, le premier écran s'affiche dans la langue de l'appareil
  // puis bascule sur celle qu'on avait choisie. Un texte qui change sous les
  // yeux se lit comme un bug.
  const hydrateLanguage = useLanguage((s) => s.hydrate);
  const languageReady = useLanguage((s) => s.isHydrated);

  useEffect(() => {
    void hydrate();
    void hydrateLanguage();
  }, [hydrate, hydrateLanguage]);

  const ready =
    (fontsLoaded || fontError !== null) && isHydrated && languageReady;

  useEffect(() => {
    // On masque même si les polices ont échoué : mieux vaut une police système
    // qu'un splash bloqué indéfiniment.
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // Attendre l'hydratation du token évite de montrer l'écran de connexion à
  // quelqu'un qui est déjà connecté.
  if (!ready) return null;

  return (
    // `GestureHandlerRootView` doit envelopper toute l'app : sans lui, les
    // gestes des tags ne reçoivent jamais d'événement sur Android.
    <GestureHandlerRootView style={styles.root}>
      {/* Le cache est restauré depuis le disque avant le premier rendu : au
          fond d'un rayon, rouvrir l'app ne doit pas exiger du réseau pour
          revoir sa liste. */}
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
        onSuccess={() => {
          // Une fois la restauration faite : ce qui attendait hors-ligne
          // repart. Sans cet appel, les gestes mis en pause avant la fermeture
          // resteraient en pause pour toujours.
          void queryClient.resumePausedMutations();
        }}
      >
        <SafeAreaProvider>
          <StatusBar style="auto" />
          {/* Dans le `SafeAreaProvider` : le toast se pose au-dessus de la
              barre d'onglets, il a besoin des encoches. */}
          <ToastProvider>
            <NavigationTree />
          </ToastProvider>
        </SafeAreaProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}

/** Enfant du provider : `useNotificationSync` a besoin du QueryClient. */
function NavigationTree() {
  useNotificationSync();

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({ root: { flex: 1 } });
