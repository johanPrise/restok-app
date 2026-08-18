import { API_BASE_URL } from './config';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /**
     * Le message vient de la validation des champs, pas d'une règle métier.
     *
     * La distinction est **structurelle** et non devinée : `ValidationPipe`
     * renvoie un tableau, nos exceptions une chaîne. Elle compte pour
     * l'affichage — « label must be longer than or equal to 2 characters »
     * est écrit pour celui qui appelle l'API, pas pour celui qui fait ses
     * courses.
     */
    readonly fromValidation = false,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Le token ne vaut plus rien : compte supprimé ou expiration. */
  get isUnauthenticated(): boolean {
    return this.status === 401;
  }
}

interface ErrorBody {
  message?: string | string[];
}

/**
 * Le backend renvoie `message` sous forme de chaîne — nos exceptions, écrites
 * pour être lues — ou de tableau quand `ValidationPipe` liste des champs
 * invalides, dans la langue de class-validator.
 */
function readErrorMessage(
  body: unknown,
  status: number,
): { message: string; fromValidation: boolean } {
  const message = (body as ErrorBody | null)?.message;

  if (Array.isArray(message)) {
    return { message: message.join('\n'), fromValidation: true };
  }
  if (typeof message === 'string') return { message, fromValidation: false };

  // Sans corps exploitable, il n'y a rien à citer : c'est à l'affichage de
  // trouver quoi dire du statut.
  return { message: '', fromValidation: false };
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, token }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  // 204 sur les suppressions et l'enregistrement du push token.
  const text = await response.text();
  const parsed: unknown = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const { message, fromValidation } = readErrorMessage(
      parsed,
      response.status,
    );
    throw new ApiError(response.status, message, fromValidation);
  }

  return parsed as T;
}
