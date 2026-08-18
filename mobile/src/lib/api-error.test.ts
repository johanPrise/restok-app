import { ApiError } from '@/api/client';
import { apiErrorMessage, latestFailure } from './api-error';

const NETWORK = "Le serveur ne répond pas. Vérifie qu'il est bien démarré.";

describe('apiErrorMessage', () => {
  it('reprend le message du backend tel quel', () => {
    expect(
      apiErrorMessage(new ApiError(409, 'Cet item est déjà sur la liste')),
    ).toBe('Cet item est déjà sur la liste');
  });

  it('traduit une panne de fetch plutôt que d’en montrer le jargon', () => {
    expect(apiErrorMessage(new TypeError('Network request failed'))).toBe(
      NETWORK,
    );
  });

  it('tient sur une erreur qui n’en est pas une', () => {
    expect(apiErrorMessage(undefined)).toBe(NETWORK);
  });
});

describe('latestFailure', () => {
  const mutation = (
    isError: boolean,
    submittedAt: number,
    message = 'Refusé',
  ) => ({ isError, submittedAt, error: new ApiError(400, message) });

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

  it('ignore les mutations qui ont réussi, même plus récentes', () => {
    expect(
      latestFailure([mutation(true, 10, 'Refusé'), mutation(false, 99)]),
    ).toBe('Refusé');
  });

  it('tient sur une liste vide', () => {
    expect(latestFailure([])).toBeNull();
  });
});
