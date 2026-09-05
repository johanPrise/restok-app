import { singleFlight } from './single-flight';

/** Une promesse qu'on résout à la main, pour tenir plusieurs appels en vol. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('singleFlight', () => {
  it('ne lance qu’un appel quand plusieurs arrivent ensemble', async () => {
    const gate = deferred<string>();
    const run = jest.fn(() => gate.promise);
    const coalesced = singleFlight(run);

    const trois = Promise.all([coalesced(), coalesced(), coalesced()]);
    gate.resolve('ok');

    // C'est tout l'objet : le serveur fait tourner le refresh token à chaque
    // usage, donc un second appel présenterait un token déjà consommé.
    await expect(trois).resolves.toEqual(['ok', 'ok', 'ok']);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('donne le même résultat à tous les appelants', async () => {
    let n = 0;
    const coalesced = singleFlight(() => Promise.resolve(++n));

    const [a, b] = await Promise.all([coalesced(), coalesced()]);

    expect(a).toBe(b);
  });

  it('repart pour un appel ultérieur', async () => {
    const run = jest.fn(() => Promise.resolve('ok'));
    const coalesced = singleFlight(run);

    await coalesced();
    await coalesced();

    // Un groupage, pas un cache : la session se renouvelle plus d'une fois
    // dans la vie de l'app.
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('propage l’échec à tous les appelants', async () => {
    const gate = deferred<string>();
    const coalesced = singleFlight(() => gate.promise);

    const a = coalesced();
    const b = coalesced();
    gate.reject(new Error('refus'));

    await expect(a).rejects.toThrow('refus');
    await expect(b).rejects.toThrow('refus');
  });

  it('repart après un échec', async () => {
    const run = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error('réseau'))
      .mockResolvedValueOnce('ok');
    const coalesced = singleFlight(run);

    await expect(coalesced()).rejects.toThrow('réseau');

    // Le drapeau retombe sur un échec aussi, sans quoi une coupure réseau
    // condamnerait la session jusqu'au redémarrage.
    await expect(coalesced()).resolves.toBe('ok');
  });
});
