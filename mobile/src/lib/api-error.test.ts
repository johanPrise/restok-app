import { ApiError } from '@/api/client';
import { apiErrorMessage, latestFailure } from './api-error';

const NETWORK = 'Pas de connexion pour le moment.';

describe('apiErrorMessage', () => {
  it('reprend une règle métier telle quelle — elle est écrite pour être lue', () => {
    expect(
      apiErrorMessage(new ApiError(409, 'Cet item est déjà sur la liste')),
    ).toBe('Cet item est déjà sur la liste');
  });

  it('ne montre pas le jargon de fetch', () => {
    expect(apiErrorMessage(new TypeError('Network request failed'))).toBe(
      NETWORK,
    );
  });

  it('tient sur une erreur qui n’en est pas une', () => {
    expect(apiErrorMessage(undefined)).toBe(NETWORK);
  });

  it('remplace le message de validation, écrit pour une API', () => {
    // « label must be longer than or equal to 2 characters » ne veut rien dire
    // pour quelqu'un qui fait ses courses — et c'est en anglais.
    const error = new ApiError(
      400,
      'label must be longer than or equal to 2 characters',
      true,
    );

    expect(apiErrorMessage(error)).toBe('Cette information n’est pas valide.');
  });

  it('ne parle jamais de serveur à redémarrer ni de code HTTP', () => {
    // Personne, dans un rayon, n'a de serveur à relancer.
    const messages = [
      apiErrorMessage(new TypeError('Failed to fetch')),
      apiErrorMessage(new ApiError(401, '')),
      apiErrorMessage(new ApiError(403, '')),
      apiErrorMessage(new ApiError(404, '')),
      apiErrorMessage(new ApiError(500, '')),
      apiErrorMessage(new ApiError(400, 'x must be a string', true)),
    ];

    for (const message of messages) {
      expect(message).not.toMatch(/serveur|démarr|API|HTTP|[0-9]{3}/i);
      expect(message.length).toBeGreaterThan(10);
    }
  });

  it('dit quoi faire quand la session tombe', () => {
    expect(apiErrorMessage(new ApiError(401, 'Unauthorized'))).toBe(
      'Ta session a expiré, reconnecte-toi.',
    );
  });

  it('assume la panne côté service sans en détailler la cause', () => {
    expect(apiErrorMessage(new ApiError(503, 'Service Unavailable'))).toBe(
      'Ça coince de notre côté. Réessaie dans un moment.',
    );
  });

  it('reste compréhensible quand le corps est vide', () => {
    expect(apiErrorMessage(new ApiError(418, ''))).toBe(
      'Cette information n’est pas valide.',
    );
  });
});

describe('latestFailure', () => {
  const mutation = (
    isError: boolean,
    submittedAt: number,
    message = 'Refusé',
  ) => ({
    isError,
    isSuccess: !isError,
    submittedAt,
    error: new ApiError(409, message),
  });

  it('ne dit rien quand tout va bien', () => {
    expect(latestFailure([mutation(false, 10)])).toBeNull();
  });

  it('montre le dernier geste tenté, pas le premier échec en mémoire', () => {
    // Un échec ancien resté en mémoire masquerait celui que l'utilisateur
    // vient de déclencher.
    expect(
      latestFailure([
        mutation(true, 10, 'Vieux refus'),
        mutation(true, 20, 'Refus récent'),
      ]),
    ).toBe('Refus récent');
  });

  it('tient sur une liste vide', () => {
    expect(latestFailure([])).toBeNull();
  });

  it('efface le reproche dès qu’un geste plus récent réussit', () => {
    // `isError` reste vrai jusqu'à la prochaine tentative de *cette* mutation :
    // sans péremption, le message restait affiché pendant qu'on continuait à
    // cocher sans problème.
    expect(
      latestFailure([mutation(true, 10, 'Refusé'), mutation(false, 20)]),
    ).toBeNull();
  });

  it('garde le reproche si la réussite lui est antérieure', () => {
    expect(
      latestFailure([mutation(false, 10), mutation(true, 20, 'Refusé')]),
    ).toBe('Refusé');
  });
});
