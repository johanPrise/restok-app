import { Redirect } from 'expo-router';
import { useSession } from '@/store/session';

/**
 * Aiguillage d'entrée. Quatre états, dans cet ordre : pas de token →
 * connexion ; token sans groupe → onboarding ; groupe sans réponse sur les
 * notifications → permission ; sinon l'étagère.
 *
 * Le layout racine a déjà attendu l'hydratation, donc la session lue ici est
 * définitive — pas de redirection qui se corrige une frame plus tard.
 */
export default function Index() {
  const token = useSession((s) => s.token);
  const groupId = useSession((s) => s.member?.groupId);
  const notificationsPrompted = useSession((s) => s.notificationsPrompted);

  if (!token) return <Redirect href="/login" />;
  if (!groupId) return <Redirect href="/intro" />;
  // Le §6 veut la permission demandée *en contexte* — une fois le groupe
  // rejoint, jamais au premier lancement à froid.
  if (!notificationsPrompted) return <Redirect href="/notifications" />;

  return <Redirect href="/shelf" />;
}
