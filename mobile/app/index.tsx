import { Redirect } from 'expo-router';
import { useSession } from '@/store/session';

/**
 * Aiguillage d'entrée. Trois états, dans cet ordre :
 * pas de token → connexion ; token sans groupe → onboarding ; sinon l'étagère.
 *
 * Le layout racine a déjà attendu l'hydratation, donc la session lue ici est
 * définitive — pas de redirection qui se corrige une frame plus tard.
 */
export default function Index() {
  const token = useSession((s) => s.token);
  const groupId = useSession((s) => s.member?.groupId);

  if (!token) return <Redirect href="/login" />;
  if (!groupId) return <Redirect href="/intro" />;

  return <Redirect href="/shelf" />;
}
