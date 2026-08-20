import { useMutationState } from '@tanstack/react-query';
import { isResumableKey } from '@/api/mutation-keys';

export interface PendingGestures {
  /** Écrits sur disque : ils repartiront, même après un redémarrage. */
  durable: number;
  /** En mémoire seule : une fermeture de l'app les emporte. */
  volatile: number;
}

/**
 * Ce qui attend le réseau, réparti par garantie.
 *
 * Les deux écrans qui affichent la barre hors-ligne doivent compter de la même
 * façon — sinon le même geste serait annoncé « en attente » ici et « pas encore
 * envoyé » là.
 */
export function usePendingGestures(): PendingGestures {
  const paused = useMutationState({
    filters: { predicate: (mutation) => mutation.state.isPaused },
    select: (mutation) => mutation.options.mutationKey,
  });

  const durable = paused.filter(isResumableKey).length;

  return { durable, volatile: paused.length - durable };
}
