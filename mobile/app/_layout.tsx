import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createQueryClient } from '@/api/query-client';
import { useNotificationSync } from '@/lib/useNotificationSync';
import { useSession } from '@/store/session';
import { appFonts } from '@/theme/fonts';

// Le splash reste visible tant que les polices ne sont pas prêtes : sans ça
// l'app affiche un premier rendu en police système, puis saute.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const [fontsLoaded, fontError] = useFonts(appFonts);

  const hydrate = useSession((s) => s.hydrate);
  const isHydrated = useSession((s) => s.isHydrated);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const ready = (fontsLoaded || fontError !== null) && isHydrated;

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
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <NavigationTree />
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

/** Enfant du provider : `useNotificationSync` a besoin du QueryClient. */
function NavigationTree() {
  useNotificationSync();

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({ root: { flex: 1 } });
