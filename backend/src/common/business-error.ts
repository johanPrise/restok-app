import {
  BadRequestException,
  ConflictException,
  HttpExceptionOptions,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Les refus de règle métier, nommés par un code stable.
 *
 * Ces messages-là sont les seuls que le client affiche **tels quels** : un 401,
 * un 403 ou un 404 se traduisent par une phrase générique côté mobile, mais un
 * 400 ou un 409 dit quelque chose de précis qu'aucune phrase générique ne
 * remplace — « Cet item est déjà sur la liste ».
 *
 * D'où le `code`. Le serveur ne peut pas choisir la langue à la place du
 * client : celui-ci laisse choisir la sienne dans ses réglages, et elle ne
 * suit donc ni l'appareil ni `Accept-Language`. Le serveur nomme le refus, le
 * client le dit dans la langue de la personne qui lit.
 *
 * `message` reste envoyé, en français : c'est ce que voient les journaux, les
 * `curl` et tout client qui ne connaîtrait pas le code — dont une version de
 * l'app plus ancienne que ce déploiement.
 */
export const BUSINESS_CODES = {
  ALREADY_IN_A_GROUP: 'already_in_a_group',
  ADMIN_CANNOT_CHANGE_OWN_ROLE: 'admin_cannot_change_own_role',
  ADMIN_CANNOT_REMOVE_SELF: 'admin_cannot_remove_self',
  BAD_CREDENTIALS: 'bad_credentials',
  EMAIL_TAKEN: 'email_taken',
  EXPORT_TOO_LARGE: 'export_too_large',
  INGREDIENT_ALREADY_IN_RECIPE: 'ingredient_already_in_recipe',
  INGREDIENT_NEEDS_ITEM_OR_LABEL: 'ingredient_needs_item_or_label',
  INITIAL_QUANTITY_REQUIRED: 'initial_quantity_required',
  INVALID_CURSOR: 'invalid_cursor',
  ITEM_ALREADY_EMPTY: 'item_already_empty',
  ITEM_CHANGED_MEANWHILE: 'item_changed_meanwhile',
  PASSWORD_REQUIRED_FOR_EMAIL_CHANGE: 'password_required_for_email_change',
  QUANTITY_REQUIRED_TO_SWITCH: 'quantity_required_to_switch',
  REFRESH_TOKEN_INVALID: 'refresh_token_invalid',
  RESET_CODE_INVALID: 'reset_code_invalid',
  RESTOCK_QUANTITY_REQUIRED: 'restock_quantity_required',
  SHOPPING_ITEM_ALREADY_LISTED: 'shopping_item_already_listed',
  SHOPPING_LINE_NEEDS_ITEM_OR_LABEL: 'shopping_line_needs_item_or_label',
  WRONG_PASSWORD: 'wrong_password',
} as const;

export type BusinessCode = (typeof BUSINESS_CODES)[keyof typeof BUSINESS_CODES];

/** Ce qui varie dans la phrase — un nom d'item, le plus souvent. */
export type BusinessValues = Record<string, string | number>;

/**
 * Le corps envoyé, quel que soit le statut.
 *
 * `statusCode` y est réémis à la main : passer un objet à une exception Nest
 * remplace **tout** le corps, et Nest cesse alors de l'ajouter lui-même. Le
 * corps reste ainsi un sur-ensemble de celui qu'il remplace.
 */
function body(
  status: HttpStatus,
  code: BusinessCode,
  message: string,
  values?: BusinessValues,
): Record<string, unknown> {
  return { statusCode: status, code, message, ...(values ? { values } : {}) };
}

/**
 * Les exceptions restent celles de Nest — `ConflictException` et non une
 * classe maison. Le code enrichit le corps, il ne remplace pas le vocabulaire :
 * un filtre, un intercepteur ou un test qui reconnaît un conflit continue de
 * le reconnaître.
 */

/** Un état incompatible : la demande était légitime, le moment ne l'est pas. */
export function conflict(
  code: BusinessCode,
  message: string,
  values?: BusinessValues,
  options?: HttpExceptionOptions,
): ConflictException {
  return new ConflictException(
    body(HttpStatus.CONFLICT, code, message, values),
    options,
  );
}

/** Une demande mal formée au regard d'une règle que les DTO ne portent pas. */
export function badRequest(
  code: BusinessCode,
  message: string,
  values?: BusinessValues,
): BadRequestException {
  return new BadRequestException(
    body(HttpStatus.BAD_REQUEST, code, message, values),
  );
}

/** Des identifiants qui ne valent pas — à ne pas confondre avec une session expirée. */
export function unauthorized(
  code: BusinessCode,
  message: string,
): UnauthorizedException {
  return new UnauthorizedException(
    body(HttpStatus.UNAUTHORIZED, code, message),
  );
}
