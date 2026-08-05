import { API_BASE_URL } from './config';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
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
 * Le backend renvoie `message` sous forme de chaîne, ou de tableau quand
 * plusieurs champs sont invalides. On aplatit pour l'affichage.
 */
function readErrorMessage(body: unknown, status: number): string {
  const message = (body as ErrorBody | null)?.message;

  if (Array.isArray(message)) return message.join('\n');
  if (typeof message === 'string') return message;

  return `Erreur ${status}`;
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
    throw new ApiError(response.status, readErrorMessage(parsed, response.status));
  }

  return parsed as T;
}
