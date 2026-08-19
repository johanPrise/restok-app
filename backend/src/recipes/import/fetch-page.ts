import { BadRequestException } from '@nestjs/common';

/** Au-delà, ce n'est pas une recette. */
const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

/**
 * Adresses qu'un serveur ne doit jamais aller chercher pour le compte d'un
 * utilisateur.
 *
 * C'est une **SSRF** qu'on ferme ici : sans ce filtre, coller
 * `http://169.254.169.254/latest/meta-data/` ferait lire à l'API les
 * identifiants de la machine et les renverrait sagement dans une recette.
 * `localhost` donnerait accès à notre propre base.
 */
const BLOCKED_HOSTS =
  /^(localhost|127\.|0\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|\[?fd)/i;

function assertPublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BadRequestException('Cette adresse n’est pas valide.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestException('Cette adresse n’est pas valide.');
  }
  if (BLOCKED_HOSTS.test(url.hostname)) {
    throw new BadRequestException('Cette adresse n’est pas valide.');
  }

  return url;
}

export type PageFetcher = (url: string) => Promise<string>;

/**
 * Récupère une page de recette.
 *
 * Les redirections sont suivies **à la main** : `fetch` les suit tout seul,
 * mais alors une page publique pourrait rediriger vers une adresse interne
 * sans qu'on ait la moindre occasion de le voir.
 */
export const fetchPage: PageFetcher = async (raw: string): Promise<string> => {
  let url = assertPublicUrl(raw);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        // Certains sites renvoient une page vide à un client anonyme.
        'User-Agent': 'Mozilla/5.0 (compatible; Restock/1.0)',
        Accept: 'text/html',
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) break;
      url = assertPublicUrl(new URL(location, url).toString());
      continue;
    }

    if (!response.ok) {
      throw new BadRequestException('Cette page n’a pas pu être ouverte.');
    }

    const body = await response.text();

    return body.slice(0, MAX_BYTES);
  }

  throw new BadRequestException('Cette page n’a pas pu être ouverte.');
};
