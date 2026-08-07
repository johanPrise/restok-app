import { Redirect, Stack } from 'expo-router';
import { useSession } from '@/store/session';

/**
 * Garde de la zone connectée.
 *
 * Sans elle, une session qui tombe en cours de route ne déplaçait personne :
 * `app/index` n'aiguille qu'à l'ouverture, et rien ne le retraverse ensuite.
 * Quelqu'un retiré de son groupe depuis un autre appareil restait donc sur
 * l'étagère — avec les items du groupe encore affichés depuis le cache.
 *
 * La redirection passe par `/`, seul endroit qui décide où va chacun : dupliquer
 * l'arbre de décision ici, c'est le voir diverger.
 */
export default function MainLayout() {
  const token = useSession((s) => s.token);
  const groupId = useSession((s) => s.member?.groupId);

  if (!token || !groupId) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
