import { ConfigService } from '@nestjs/config';
import { DEFAULT_EXPO_PUSH_URL, ExpoPushAdapter } from './expo-push.adapter';
import { DEVICE_NOT_REGISTERED, PushMessage } from './push-provider.interface';

describe('ExpoPushAdapter', () => {
  const adapter = new ExpoPushAdapter();
  let fetchMock: jest.SpyInstance;

  const message = (token: string): PushMessage => ({
    to: token,
    title: 'Restock',
    body: 'PQ épuisé',
  });

  const respondWith = (body: unknown, ok = true, status = 200) =>
    fetchMock.mockResolvedValue({
      ok,
      status,
      json: () => Promise.resolve(body),
    });

  const calledUrl = (index = 0): string =>
    (fetchMock.mock.calls[index] as [string, RequestInit])[0];

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => fetchMock.mockRestore());

  it('poste les messages avec un son par défaut', async () => {
    respondWith({ data: [{ status: 'ok' }] });

    await adapter.send([message('tok-1')]);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(DEFAULT_EXPO_PUSH_URL);
    expect(JSON.parse(init.body as string)).toEqual([
      { to: 'tok-1', title: 'Restock', body: 'PQ épuisé', sound: 'default' },
    ]);
  });

  it('remonte un succès', async () => {
    respondWith({ data: [{ status: 'ok' }] });

    await expect(adapter.send([message('tok-1')])).resolves.toEqual([
      { token: 'tok-1', success: true },
    ]);
  });

  it("remonte l'erreur détaillée d'Expo", async () => {
    respondWith({
      data: [{ status: 'error', details: { error: DEVICE_NOT_REGISTERED } }],
    });

    await expect(adapter.send([message('tok-1')])).resolves.toEqual([
      { token: 'tok-1', success: false, error: DEVICE_NOT_REGISTERED },
    ]);
  });

  it('associe chaque ticket à son message par la position', async () => {
    respondWith({
      data: [
        { status: 'ok' },
        { status: 'error', details: { error: DEVICE_NOT_REGISTERED } },
      ],
    });

    await expect(
      adapter.send([message('tok-1'), message('tok-2')]),
    ).resolves.toEqual([
      { token: 'tok-1', success: true },
      { token: 'tok-2', success: false, error: DEVICE_NOT_REGISTERED },
    ]);
  });

  describe('échecs', () => {
    it('marque tout en échec sur une réponse HTTP non OK', async () => {
      respondWith({}, false, 503);

      await expect(adapter.send([message('tok-1')])).resolves.toEqual([
        { token: 'tok-1', success: false, error: 'HTTP 503' },
      ]);
    });

    it('marque tout en échec si le réseau lâche', async () => {
      fetchMock.mockRejectedValue(new Error('fetch failed'));

      const [result] = await adapter.send([message('tok-1')]);

      expect(result).toMatchObject({ token: 'tok-1', success: false });
    });

    it('traite un ticket manquant comme un échec', async () => {
      // La version du §6 teste `receipt?.status !== 'error'`, ce qui déclare
      // réussi un envoi dont on n'a aucune trace.
      respondWith({ data: [] });

      await expect(adapter.send([message('tok-1')])).resolves.toEqual([
        { token: 'tok-1', success: false, error: 'Réponse Expo incomplète' },
      ]);
    });

    it("n'invente pas de DeviceNotRegistered sur un échec réseau", async () => {
      // Sinon NotificationsService effacerait des tokens parfaitement valides.
      fetchMock.mockRejectedValue(new Error('ECONNRESET'));

      const [result] = await adapter.send([message('tok-1')]);

      expect(result.error).not.toBe(DEVICE_NOT_REGISTERED);
    });
  });

  describe('URL', () => {
    it('vise Expo par défaut', async () => {
      respondWith({ data: [{ status: 'ok' }] });

      await adapter.send([message('tok-1')]);

      expect(calledUrl()).toBe(DEFAULT_EXPO_PUSH_URL);
    });

    it('accepte une URL de substitution', async () => {
      respondWith({ data: [{ status: 'ok' }] });
      const stubbed = new ExpoPushAdapter({
        get: () => 'http://localhost:9999/push',
      } as unknown as ConfigService);

      await stubbed.send([message('tok-1')]);

      expect(calledUrl()).toBe('http://localhost:9999/push');
    });
  });

  describe('lots', () => {
    it('découpe au-delà de 100 messages', async () => {
      // Expo refuse les lots plus gros — le §1 cible aussi les associations.
      respondWith({
        data: Array.from({ length: 100 }, () => ({ status: 'ok' })),
      });
      const messages = Array.from({ length: 250 }, (_, i) =>
        message(`tok-${i}`),
      );

      await adapter.send(messages);

      expect(fetchMock).toHaveBeenCalledTimes(3);
      const sizes = fetchMock.mock.calls.map(
        ([, init]) =>
          (JSON.parse((init as RequestInit).body as string) as unknown[])
            .length,
      );
      expect(sizes).toEqual([100, 100, 50]);
    });

    it("n'appelle pas Expo sans message", async () => {
      await expect(adapter.send([])).resolves.toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
