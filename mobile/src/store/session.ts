import { create } from 'zustand';
import type { AuthenticatedMember } from '@/types/api';
import { secureStorage } from './secure-storage';

const SESSION_KEY = 'restock.session';

interface PersistedSession {
  token: string;
  member: AuthenticatedMember;
  /**
   * L'utilisateur a-t-il déjà vu l'écran de permission des notifications ?
   * Persisté avec la session, donc par compte : changer de compte redemande,
   * ce qui est le comportement voulu.
   */
  notificationsPrompted: boolean;
  /**
   * Le balayage d'un tag a-t-il déjà été fait ? Persisté par compte, comme
   * ci-dessus : le geste s'apprend une fois, pas à chaque installation.
   */
  swipeLearned: boolean;
}

interface SessionState {
  token: string | null;
  member: AuthenticatedMember | null;
  notificationsPrompted: boolean;
  swipeLearned: boolean;
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
  markNotificationsPrompted: () => Promise<void>;
  /**
   * Le balayage d'un tag a été fait au moins une fois — le repère qui
   * l'enseigne n'a plus lieu d'être.
   */
  markSwipeLearned: () => Promise<void>;
}

const EMPTY = {
  token: null,
  member: null,
  notificationsPrompted: false,
  swipeLearned: false,
} as const;

/**
 * Session : uniquement ce qui est vraiment global. Tout l'état serveur (items,
 * membres, historique) appartient à TanStack Query — aucun chevauchement.
 *
 * Le membre est persisté avec le token faute d'endpoint « qui suis-je » côté
 * backend : sans lui, quelqu'un qui rouvre l'app repartirait vers l'onboarding
 * alors qu'il a déjà un groupe. C'est un cache, pas une source de vérité — le
 * serveur reste seul juge, et un 401 ou un 403 le corrige.
 */
export const useSession = create<SessionState>((set, get) => {
  /** Écrit l'état courant dans le stockage sécurisé, token présent ou non. */
  const persist = async (next: Partial<PersistedSession>) => {
    const { token, member, notificationsPrompted, swipeLearned } = {
      ...get(),
      ...next,
    };
    if (!token || !member) return;

    await secureStorage.set(
      SESSION_KEY,
      JSON.stringify({
        token,
        member,
        notificationsPrompted,
        swipeLearned,
      } satisfies PersistedSession),
    );
  };

  return {
    ...EMPTY,
    isHydrated: false,

    hydrate: async () => {
      try {
        const raw = await secureStorage.get(SESSION_KEY);
        const session = raw ? (JSON.parse(raw) as PersistedSession) : null;
        set({
          token: session?.token ?? null,
          member: session?.member ?? null,
          notificationsPrompted: session?.notificationsPrompted ?? false,
          swipeLearned: session?.swipeLearned ?? false,
          isHydrated: true,
        });
      } catch {
        // Trousseau illisible ou JSON corrompu : on repart déconnecté plutôt
        // que de bloquer l'app au démarrage.
        set({ ...EMPTY, isHydrated: true });
      }
    },

    signIn: async (token, member) => {
      await persist({
        token,
        member,
        notificationsPrompted: false,
        swipeLearned: false,
      });
      set({
        token,
        member,
        notificationsPrompted: false,
        swipeLearned: false,
      });
    },

    signOut: async () => {
      await secureStorage.remove(SESSION_KEY);
      set({ ...EMPTY });
    },

    setMember: async (member) => {
      await persist({ member });
      set({ member });
    },

    markNotificationsPrompted: async () => {
      await persist({ notificationsPrompted: true });
      set({ notificationsPrompted: true });
    },

    markSwipeLearned: async () => {
      if (get().swipeLearned) return;
      await persist({ swipeLearned: true });
      set({ swipeLearned: true });
    },
  };
});
