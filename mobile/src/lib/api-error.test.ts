import { ApiError } from '@/api/client';
import { apiErrorMessage, latestFailure } from './api-error';

const NETWORK = 'Pas de connexion pour le moment.';

describe('apiErrorMessage', () => {
  it('reprend une règle métier telle quelle — elle est écrite pour être lue', () => {
    expect(
      apiErrorMessage(new ApiError(409, 'Cet item est déjà sur la liste'), 'fr'),
    ).toBe('Cet item est déjà sur la liste');
  });

  it('ne montre pas le jargon de fetch', () => {
    expect(apiErrorMessage(new TypeError('Network request failed'), 'fr')).toBe(
      NETWORK,
    );
  });

  it('tient sur une erreur qui n’en est pas une', () => {
    expect(apiErrorMessage(undefined, 'fr')).toBe(NETWORK);
  });

  it('remplace le message de validation, écrit pour une API', () => {
    // « label must be longer than or equal to 2 characters » ne veut rien dire
    // pour quelqu'un qui fait ses courses — et c'est en anglais.
    const error = new ApiError(
      400,
      'label must be longer than or equal to 2 characters',
      true,
    );

    expect(apiErrorMessage(error, 'fr')).toBe(
      'Cette information n’est pas valide.',
    );
    expect(apiErrorMessage(error, 'en')).toBe('That information is not valid.');
  });

  it('ne parle jamais de serveur à redémarrer ni de code HTTP', () => {
    // Personne, dans un rayon, n'a de serveur à relancer.
    const messages = [
      apiErrorMessage(new TypeError('Failed to fetch'), 'fr'),
      apiErrorMessage(new ApiError(401, ''), 'fr'),
      apiErrorMessage(new ApiError(403, ''), 'fr'),
      apiErrorMessage(new ApiError(404, ''), 'fr'),
      apiErrorMessage(new ApiError(500, ''), 'fr'),
      apiErrorMessage(new ApiError(400, 'x must be a string', true), 'fr'),
    ];

    for (const message of messages) {
      expect(message).not.toMatch(/serveur|démarr|API|HTTP|[0-9]{3}/i);
      expect(message.length).toBeGreaterThan(10);
    }
  });

  it('dit quoi faire quand la session tombe', () => {
    expect(apiErrorMessage(new ApiError(401, 'Unauthorized'), 'fr')).toBe(
      'Ta session a expiré, reconnecte-toi.',
    );
  });

  it('assume la panne côté service sans en détailler la cause', () => {
    expect(apiErrorMessage(new ApiError(503, 'Service Unavailable'), 'fr')).toBe(
      'Ça coince de notre côté. Réessaie dans un moment.',
    );
  });

  it('reste compréhensible quand le corps est vide', () => {
    expect(apiErrorMessage(new ApiError(418, ''), 'fr')).toBe(
      'Cette information n’est pas valide.',
    );
  });
});

describe('apiErrorMessage — les refus nommés par le serveur', () => {
  const named = (
    status: number,
    code: string,
    values: Record<string, string | number> = {},
  ) => new ApiError(status, 'la phrase française du serveur', false, code, values);

  it('dit le refus dans la langue choisie, pas dans celle du serveur', () => {
    const error = named(409, 'shopping_item_already_listed');

    expect(apiErrorMessage(error, 'fr')).toBe('Cet item est déjà sur la liste.');
    expect(apiErrorMessage(error, 'en')).toBe(
      'That item is already on the list.',
    );
  });

  it('replace ce que le serveur a laissé varier', () => {
    const error = named(409, 'item_already_empty', { nom: 'Café en grains' });

    expect(apiErrorMessage(error, 'fr')).toContain('Café en grains');
    expect(apiErrorMessage(error, 'en')).toBe(
      '“Café en grains” is already out — there is nothing left to take.',
    );
  });

  it('distingue un mot de passe faux d’une session expirée', () => {
    // Les deux sont des 401. Sans le code, l'écran de connexion répondait « ta
    // session a expiré » à quelqu'un qui n'en avait jamais ouvert.
    expect(apiErrorMessage(named(401, 'bad_credentials'), 'fr')).toBe(
      'Email ou mot de passe incorrect.',
    );
    expect(apiErrorMessage(new ApiError(401, ''), 'fr')).toBe(
      'Ta session a expiré, reconnecte-toi.',
    );
  });

  it('retombe sur la phrase du serveur pour un code qu’il ne connaît pas', () => {
    // Un backend déployé en avance sur l'app nomme des refus que celle-ci
    // n'a pas encore appris. Mieux vaut sa phrase que « cette information
    // n'est pas valide ».
    const error = new ApiError(
      409,
      'Un refus tout neuf, écrit pour être lu',
      false,
      'code_invente_la_semaine_prochaine',
    );

    expect(apiErrorMessage(error, 'fr')).toBe(
      'Un refus tout neuf, écrit pour être lu',
    );
  });

  it('ne laisse pas un code passer devant la validation des champs', () => {
    // `ValidationPipe` ne nomme rien : un code ici serait une confusion, et sa
    // phrase reste celle d'un contrat d'API.
    const error = new ApiError(400, 'label must be longer', true);

    expect(apiErrorMessage(error, 'fr')).toBe(
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
    expect(latestFailure([mutation(false, 10)], 'fr')).toBeNull();
  });

  it('montre le dernier geste tenté, pas le premier échec en mémoire', () => {
    // Un échec ancien resté en mémoire masquerait celui que l'utilisateur
    // vient de déclencher.
    expect(
      latestFailure([
        mutation(true, 10, 'Vieux refus'),
        mutation(true, 20, 'Refus récent'),
      ], 'fr'),
    ).toBe('Refus récent');
  });

  it('tient sur une liste vide', () => {
    expect(latestFailure([], 'fr')).toBeNull();
  });

  it('efface le reproche dès qu’un geste plus récent réussit', () => {
    // `isError` reste vrai jusqu'à la prochaine tentative de *cette* mutation :
    // sans péremption, le message restait affiché pendant qu'on continuait à
    // cocher sans problème.
    expect(
      latestFailure([mutation(true, 10, 'Refusé'), mutation(false, 20)], 'fr'),
    ).toBeNull();
  });

  it('garde le reproche si la réussite lui est antérieure', () => {
    expect(
      latestFailure([mutation(false, 10), mutation(true, 20, 'Refusé')], 'fr'),
    ).toBe('Refusé');
  });
});
