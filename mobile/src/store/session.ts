import { create } from 'zustand';
import { secureStorage } from './secure-storage';
import type { AuthenticatedMember } from '@/types/api';

const SESSION_KEY = 'restock.session';

interface PersistedSession {
  token: string;
  member: AuthenticatedMember;
}

interface SessionState {
  token: string | null;
  member: AuthenticatedMember | null;
  /** Faux tant que la session n'a pas été relue du stockage sécurisé. */
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  signIn: (token: string, member: AuthenticatedMember) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Met à jour le membre sans toucher au token — après création ou jointure
   * d'un groupe, ou quand le serveur révèle que l'appartenance a changé.
   */
  setMember: (member: AuthenticatedMember) => Promise<void>;
}

/**
 * Session : uniquement ce qui est vraiment global. Tout l'état serveur (items,
 * membres, historique) appartient à TanStack Query — aucun chevauchement.
 *
 * Le membre est persisté avec le token faute d'endpoint « qui suis-je » côté
 * backend : sans lui, quelqu'un qui rouvre l'app repartirait vers l'onboarding
 * alors qu'il a déjà un groupe. C'est un cache, pas une source de vérité — le
 * serveur reste seul juge, et un 401 ou un 403 le corrige.
 */
export const useSession = create<SessionState>((set, get) => ({
  token: null,
  member: null,
  isHydrated: false,

  hydrate: async () => {
    try {
      const raw = await secureStorage.get(SESSION_KEY);
      const session = raw ? (JSON.parse(raw) as PersistedSession) : null;
      set({
        token: session?.token ?? null,
        member: session?.member ?? null,
        isHydrated: true,
      });
    } catch {
      // Trousseau illisible ou JSON corrompu : on repart déconnecté plutôt
      // que de bloquer l'app au démarrage.
      set({ token: null, member: null, isHydrated: true });
    }
  },

  signIn: async (token, member) => {
    await secureStorage.set(
      SESSION_KEY,
      JSON.stringify({ token, member } satisfies PersistedSession),
    );
    set({ token, member });
  },

  signOut: async () => {
    await secureStorage.remove(SESSION_KEY);
    set({ token: null, member: null });
  },

  setMember: async (member) => {
    const { token } = get();
    if (token) {
      await secureStorage.set(
        SESSION_KEY,
        JSON.stringify({ token, member } satisfies PersistedSession),
      );
    }
    set({ member });
  },
}));
