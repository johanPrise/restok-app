import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import type { AuthenticatedMember } from '@/types/api';

const TOKEN_KEY = 'restock.accessToken';

interface SessionState {
  token: string | null;
  member: AuthenticatedMember | null;
  /** Faux tant que le token n'a pas été relu du stockage sécurisé. */
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  signIn: (token: string, member: AuthenticatedMember) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Rafraîchit le membre en session sans toucher au token — après la création
   * ou la jointure d'un groupe, où `groupId` et `role` changent.
   */
  setMember: (member: AuthenticatedMember) => void;
}

/**
 * Session : uniquement ce qui est vraiment global. Tout l'état serveur (items,
 * membres, historique) appartient à TanStack Query — aucun chevauchement.
 *
 * Le token vit dans `expo-secure-store`, pas dans AsyncStorage : c'est un
 * porteur d'identité.
 */
export const useSession = create<SessionState>((set) => ({
  token: null,
  member: null,
  isHydrated: false,

  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      set({ token, isHydrated: true });
    } catch {
      // Trousseau illisible : on repart déconnecté plutôt que de bloquer
      // l'app au démarrage.
      set({ token: null, isHydrated: true });
    }
  },

  signIn: async (token, member) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token, member });
  },

  signOut: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null, member: null });
  },

  setMember: (member) => set({ member }),
}));

/** Lecture hors composant, pour le client HTTP. */
export const getToken = (): string | null => useSession.getState().token;
