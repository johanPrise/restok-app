import { useSession } from '@/store/session';
import { authedRequest } from './authed';
import { ApiError } from './client';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Le cache sur disque et le client de requêtes ne sont pas le sujet : ce test
// regarde ce qui part sur le réseau et ce que devient la session.
jest.mock('./persist', () => ({ purgePersistedCache: jest.fn() }));
jest.mock('./query-client', () => ({ queryClient: { clear: jest.fn() } }));

const member = {
  id: 'member-1',
  name: 'Yorick',
  email: 'yorick@test.dev',
  role: 'member' as const,
  groupId: null,
};

const json = (status: number, body: unknown) =>
  Promise.resolve({
    ok: status < 400,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);

/** Le jeton porté par une requête, tel qu'il part dans l'en-tête. */
const bearerOf = (call: [string, RequestInit]) =>
  (call[1].headers as Record<string, string>).Authorization;

describe('authedRequest', () => {
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await useSession
      .getState()
      .signIn({ accessToken: 'jwt-1', refreshToken: 'refresh-1' }, member);
  });

  it('joint le token courant', async () => {
    fetchMock.mockImplementation(() => json(200, { ok: true }));

    await authedRequest('/items');

    expect(bearerOf(fetchMock.mock.calls[0] as [string, RequestInit])).toBe(
      'Bearer jwt-1',
    );
  });

  describe('quand le token a expiré', () => {
    /** 401, puis un renouvellement qui réussit, puis la requête rejouée. */
    const expiredThenRenewed = () => {
      let premierEssai = true;

      fetchMock.mockImplementation((url: string) => {
        if (url.includes('/auth/refresh')) {
          return json(200, {
            accessToken: 'jwt-2',
            refreshToken: 'refresh-2',
            member,
          });
        }
        if (premierEssai) {
          premierEssai = false;
          return json(401, { message: 'Session invalide' });
        }
        return json(200, { items: [] });
      });
    };

    it('renouvelle et rejoue sans que personne ne voie rien', async () => {
      expiredThenRenewed();

      await expect(authedRequest('/items')).resolves.toEqual({ items: [] });
      expect(useSession.getState().token).toBe('jwt-2');
    });

    it('rejoue avec le jeton neuf, pas celui qui vient d’échouer', async () => {
      expiredThenRenewed();

      await authedRequest('/items');

      const calls = fetchMock.mock.calls as [string, RequestInit][];
      // Le token est relu à chaque essai plutôt que capturé une fois : c'est
      // tout l'intérêt du second.
      expect(bearerOf(calls[0])).toBe('Bearer jwt-1');
      expect(bearerOf(calls[2])).toBe('Bearer jwt-2');
    });

    it('ne déconnecte pas', async () => {
      expiredThenRenewed();

      await authedRequest('/items');

      expect(useSession.getState().member).not.toBeNull();
    });
  });

  describe('quand la session est vraiment finie', () => {
    beforeEach(() => {
      // Le renouvellement échoue aussi : le token n'a pas seulement expiré, il
      // a été révoqué — ou le compte a disparu.
      fetchMock.mockImplementation(() =>
        json(401, { message: 'Session invalide' }),
      );
    });

    it('termine la session', async () => {
      await expect(authedRequest('/items')).rejects.toBeInstanceOf(ApiError);

      expect(useSession.getState().token).toBeNull();
      expect(useSession.getState().member).toBeNull();
    });

    it('ne rejoue pas une requête qu’aucun jeton neuf ne sauverait', async () => {
      await authedRequest('/items').catch(() => undefined);

      const essais = (fetchMock.mock.calls as [string][]).filter(
        ([url]) => !url.includes('/auth/refresh'),
      );
      expect(essais).toHaveLength(1);
    });
  });

  it('renonce si le jeton neuf est refusé à son tour', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.includes('/auth/refresh')
        ? json(200, {
            accessToken: 'jwt-2',
            refreshToken: 'refresh-2',
            member,
          })
        : json(401, { message: 'Session invalide' }),
    );

    await expect(authedRequest('/items')).rejects.toBeInstanceOf(ApiError);

    // Un serveur qui répond 401 à un token qu'il vient d'émettre ne dirait pas
    // autre chose la troisième fois : une reprise, jamais de boucle.
    const essais = (fetchMock.mock.calls as [string][]).filter(
      ([url]) => !url.includes('/auth/refresh'),
    );
    expect(essais).toHaveLength(2);
    expect(useSession.getState().token).toBeNull();
  });

  it('laisse remonter les autres erreurs sans toucher à la session', async () => {
    fetchMock.mockImplementation(() =>
      json(409, { message: 'Cet item est déjà sur la liste' }),
    );

    await expect(authedRequest('/shopping')).rejects.toBeInstanceOf(ApiError);
    expect(useSession.getState().token).toBe('jwt-1');
  });
});
