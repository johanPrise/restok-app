import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';

/**
 * Revenir en arrière, ou à défaut rejoindre l'étagère.
 *
 * `router.back()` ne fait **rien** quand la pile est vide — ce qui arrive dès
 * qu'un écran est atteint autrement que par une navigation : lien profond,
 * rechargement, ou notification tapée. La flèche de retour restait alors sans
 * effet, sans rien pour le signaler.
 */
export function useGoBack(fallback: Href = '/shelf'): () => void {
  const router = useRouter();

  return () => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  };
}
