import { useSession } from '@/store/session';
import { renewSession, revokeSession } from './session';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const member = {
  id: 'member-1',
  name: 'Yorick',
  email: 'yorick@test.dev',
  role: 'member' as const,
  groupId: null,
};

/** Une réponse de `/auth/refresh` telle que `fetch` la rendrait. */
const renewed = (accessToken: string, refreshToken: string) =>
  Promise.resolve({
    ok: true,
    status: 200,
    text: () =>
      Promise.resolve(JSON.stringify({ accessToken, refreshToken, member })),
  } as Response);

const refused = () =>
  Promise.resolve({
    ok: false,
    status: 401,
    text: () => Promise.resolve(JSON.stringify({ message: 'Session expirée' })),
  } as Response);

describe('renewSession', () => {
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await useSession
      .getState()
      .signIn({ accessToken: 'jwt-1', refreshToken: 'refresh-1' }, member);
  });

  it('échange le refresh token et écrit les jetons neufs', async () => {
    fetchMock.mockImplementation(() => renewed('jwt-2', 'refresh-2'));

    await expect(renewSession('jwt-1')).resolves.toBe(true);

    expect(useSession.getState().token).toBe('jwt-2');
    // Le serveur fait tourner le refresh token : garder l'ancien ferait
    // prendre le renouvellement suivant pour un vol.
    expect(useSession.getState().refreshToken).toBe('refresh-2');
  });

  it('envoie le refresh token dans le corps, jamais en en-tête', async () => {
    fetchMock.mockImplementation(() => renewed('jwt-2', 'refresh-2'));

    await renewSession('jwt-1');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/auth/refresh');
    expect(JSON.parse(init.body as string)).toEqual({
      refreshToken: 'refresh-1',
    });
    // `Authorization` porte l'access token, qui est justement expiré ici.
    expect(init.headers).not.toHaveProperty('Authorization');
  });

  it('ne rafraîchit qu’une fois pour une rafale de 401', async () => {
    fetchMock.mockImplementation(() => renewed('jwt-2', 'refresh-2'));

    const rafale = await Promise.all([
      renewSession('jwt-1'),
      renewSession('jwt-1'),
      renewSession('jwt-1'),
    ]);

    expect(rafale).toEqual([true, true, true]);
    // Le deuxième appel aurait présenté un token déjà consommé, que le serveur
    // traite — à raison — comme un vol.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ne refait rien si le renouvellement a déjà eu lieu', async () => {
    fetchMock.mockImplementation(() => renewed('jwt-2', 'refresh-2'));

    // Une requête partie avec `jwt-1`, revenue en 401 après que le magasin est
    // déjà passé à `jwt-2` : il n'y a rien à refaire, seulement à réessayer.
    await useSession
      .getState()
      .renew({ accessToken: 'jwt-2', refreshToken: 'refresh-2' }, member);

    await expect(renewSession('jwt-1')).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renonce quand le serveur refuse', async () => {
    fetchMock.mockImplementation(refused);

    await expect(renewSession('jwt-1')).resolves.toBe(false);
    // La session n'est pas effacée ici : c'est à l'appelant de trancher entre
    // réessayer et se déconnecter.
    expect(useSession.getState().token).toBe('jwt-1');
  });

  it('renonce quand le réseau est coupé', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    await expect(renewSession('jwt-1')).resolves.toBe(false);
  });

  it('ne tente rien sans refresh token', async () => {
    // Une session écrite avant que le renouvellement existe : elle se referme
    // comme elle le faisait déjà, sans requête inutile.
    await useSession.getState().signOut();
    useSession.setState({ token: 'jwt-ancien', member });

    await expect(renewSession('jwt-ancien')).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('repart pour un renouvellement ultérieur', async () => {
    fetchMock.mockImplementation(() => renewed('jwt-2', 'refresh-2'));
    await renewSession('jwt-1');

    fetchMock.mockImplementation(() => renewed('jwt-3', 'refresh-3'));
    await renewSession('jwt-2');

    expect(useSession.getState().token).toBe('jwt-3');
  });
});

describe('revokeSession', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 204,
        text: () => Promise.resolve(''),
      } as Response),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  it('ferme la session longue côté serveur', () => {
    revokeSession('refresh-1');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/auth/logout');
    expect(JSON.parse(init.body as string)).toEqual({
      refreshToken: 'refresh-1',
    });
  });

  it('n’appelle rien sans refresh token', () => {
    revokeSession(null);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ne fait pas dépendre la déconnexion du réseau', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    // Faire attendre ici retiendrait dans un compte celui qui essaie d'en
    // sortir. L'échec ne doit surtout pas remonter.
    expect(() => revokeSession('refresh-1')).not.toThrow();
    await Promise.resolve();
  });
});
