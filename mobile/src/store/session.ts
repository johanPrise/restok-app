import { create } from 'zustand';
import { type HintId, type Learned, learnedFrom } from '@/lib/hints';
import type { AuthenticatedMember } from '@/types/api';
import { secureStorage } from './secure-storage';

const SESSION_KEY = 'restock.session';

interface PersistedSession {
  token: string;
  /**
   * La session longue.
   *
   * Optionnel : une session déjà sur l'appareil a été écrite avant que le
   * renouvellement existe, et ne le porte donc pas. Elle continue de
   * fonctionner jusqu'à son premier 401, où faute de quoi renouveler elle se
   * referme — c'est-à-dire exactement ce qu'elle faisait avant.
   */
  refreshToken?: string;
  member: AuthenticatedMember;
  /**
   * L'utilisateur a-t-il déjà vu l'écran de permission des notifications ?
   * Persisté avec la session, donc par compte : changer de compte redemande,
   * ce qui est le comportement voulu.
   */
  notificationsPrompted: boolean;
  /**
   * Ce que les repères ont déjà enseigné. Persisté par compte, comme ci-dessus :
   * un geste s'apprend une fois, pas à chaque installation.
   */
  learned: Learned;
  /**
   * L'ancien drapeau, du temps où le balayage était le seul repère.
   *
   * Il n'est plus écrit, seulement lu : une session déjà sur l'appareil le
   * porte encore, et l'ignorer ferait réapprendre le balayage à tous ceux qui
   * le connaissent — la mise à jour se manifesterait par une régression.
   *
   * @deprecated Repris par `learned.swipe` à la première relecture.
   */
  swipeLearned?: boolean;
}

/** Ce que le serveur rend à l'ouverture d'une session, et à son renouvellement. */
export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

interface SessionState {
  token: string | null;
  refreshToken: string | null;
  member: AuthenticatedMember | null;
  notificationsPrompted: boolean;
  learned: Learned;
  /** Faux tant que la session n'a pas été relue du stockage sécurisé. */
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  signIn: (tokens: SessionTokens, member: AuthenticatedMember) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * La même session, avec des jetons neufs — après un renouvellement.
   *
   * Distinct de `signIn` sur un point qui compte : les repères déjà appris et
   * l'écran de permission déjà vu **restent**. Les réinitialiser ferait
   * réexpliquer le balayage toutes les heures à quelqu'un qui n'a rien fait
   * d'autre que laisser l'app ouverte.
   */
  renew: (tokens: SessionTokens, member: AuthenticatedMember) => Promise<void>;
  /**
   * Met à jour le membre sans toucher au token — après création ou jointure
   * d'un groupe, ou quand le serveur révèle que l'appartenance a changé.
   */
  setMember: (member: AuthenticatedMember) => Promise<void>;
  markNotificationsPrompted: () => Promise<void>;
  /**
   * Ce repère a fait son travail — il ne reviendra pas.
   *
   * Appelé au **geste**, pas seulement au renvoi : un repère qui ne
   * disparaîtrait qu'en le chassant réapparaîtrait devant quelqu'un qui a déjà
   * compris.
   */
  markLearned: (id: HintId) => Promise<void>;
}

const EMPTY = {
  token: null,
  refreshToken: null,
  member: null,
  notificationsPrompted: false,
  learned: {} as Learned,
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
    const { token, refreshToken, member, notificationsPrompted, learned } = {
      ...get(),
      ...next,
    };
    if (!token || !member) return;

    await secureStorage.set(
      SESSION_KEY,
      JSON.stringify({
        token,
        ...(refreshToken ? { refreshToken } : {}),
        member,
        notificationsPrompted,
        learned,
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
          refreshToken: session?.refreshToken ?? null,
          member: session?.member ?? null,
          notificationsPrompted: session?.notificationsPrompted ?? false,
          learned: learnedFrom(session),
          isHydrated: true,
        });
      } catch {
        // Trousseau illisible ou JSON corrompu : on repart déconnecté plutôt
        // que de bloquer l'app au démarrage.
        set({ ...EMPTY, isHydrated: true });
      }
    },

    signIn: async ({ accessToken, refreshToken }, member) => {
      await persist({
        token: accessToken,
        refreshToken,
        member,
        notificationsPrompted: false,
        learned: {},
      });
      set({
        token: accessToken,
        refreshToken,
        member,
        notificationsPrompted: false,
        learned: {},
      });
    },

    renew: async ({ accessToken, refreshToken }, member) => {
      await persist({ token: accessToken, refreshToken, member });
      set({ token: accessToken, refreshToken, member });
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

    markLearned: async (id) => {
      if (get().learned[id]) return;

      const learned = { ...get().learned, [id]: true };
      await persist({ learned });
      set({ learned });
    },
  };
});
