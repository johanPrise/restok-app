import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  badRequest,
  BUSINESS_CODES,
  conflict,
  unauthorized,
} from './business-error';

describe('les codes', () => {
  it('sont uniques — deux refus qui partagent un nom sont indistinguables', () => {
    const codes = Object.values(BUSINESS_CODES);

    expect(new Set(codes).size).toBe(codes.length);
  });

  it('s’écrivent en snake_case, comme le reste du vocabulaire de l’API', () => {
    // Le client s'en sert comme clé de traduction : une casse qui varie ferait
    // rater la phrase sans que rien ne casse.
    for (const code of Object.values(BUSINESS_CODES)) {
      expect(code).toMatch(/^[a-z]+(_[a-z]+)*$/);
    }
  });
});

describe('le corps de la réponse', () => {
  /**
   * C'est le contrat dont dépend le client : il lit `code` pour choisir sa
   * phrase, et retombe sur `message` quand le code lui est inconnu. Passer un
   * objet à une exception Nest remplace **tout** le corps — d'où `statusCode`
   * réémis à la main, et d'où ce test.
   */
  it('porte le statut, le code et la phrase du serveur', () => {
    const error = conflict(
      BUSINESS_CODES.SHOPPING_ITEM_ALREADY_LISTED,
      'Cet item est déjà sur la liste',
    );

    expect(error.getResponse()).toEqual({
      statusCode: HttpStatus.CONFLICT,
      code: 'shopping_item_already_listed',
      message: 'Cet item est déjà sur la liste',
    });
  });

  it('n’ajoute `values` que lorsqu’il y a quelque chose à faire varier', () => {
    const sans = badRequest(
      BUSINESS_CODES.WRONG_PASSWORD,
      'Mot de passe incorrect',
    );
    const avec = conflict(
      BUSINESS_CODES.ITEM_ALREADY_EMPTY,
      '« Café » est déjà épuisé',
      { nom: 'Café' },
    );

    expect(sans.getResponse()).not.toHaveProperty('values');
    expect(avec.getResponse()).toHaveProperty('values', { nom: 'Café' });
  });

  it('garde le statut HTTP et le corps d’accord', () => {
    const error = badRequest(
      BUSINESS_CODES.INITIAL_QUANTITY_REQUIRED,
      'Précise la quantité initiale',
    );

    expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(error.getResponse()).toHaveProperty(
      'statusCode',
      HttpStatus.BAD_REQUEST,
    );
  });
});

describe('les exceptions rendues', () => {
  /**
   * Elles restent celles de Nest. Le code enrichit le corps, il ne remplace
   * pas le vocabulaire : tout ce qui reconnaissait un conflit — un filtre, un
   * test, un intercepteur — continue de le reconnaître.
   */
  it('sont les classes de Nest, pas une classe maison', () => {
    expect(conflict(BUSINESS_CODES.EMAIL_TAKEN, 'x')).toBeInstanceOf(
      ConflictException,
    );
    expect(badRequest(BUSINESS_CODES.WRONG_PASSWORD, 'x')).toBeInstanceOf(
      BadRequestException,
    );
    expect(unauthorized(BUSINESS_CODES.BAD_CREDENTIALS, 'x')).toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('transportent la cause sans la publier', () => {
    // La transition interdite intéresse les journaux, pas la personne qui
    // fait ses courses.
    const error = conflict(
      BUSINESS_CODES.ITEM_CHANGED_MEANWHILE,
      'Cet item a changé entre-temps.',
      undefined,
      { cause: 'Transition interdite : available → to_restock' },
    );

    expect(error.cause).toBe('Transition interdite : available → to_restock');
    expect(JSON.stringify(error.getResponse())).not.toContain('Transition');
  });
});
