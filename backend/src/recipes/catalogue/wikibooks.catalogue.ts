import { Injectable } from '@nestjs/common';
import { Catalogue, CatalogueEntry } from './catalogue';

const API = 'https://fr.wikibooks.org/w/api.php';
/** Le livre de cuisine, et rien d'autre du wiki. */
const BOOK = 'Livre de cuisine/';
const TIMEOUT_MS = 8000;

/**
 * Wikilivres, « Livre de cuisine ».
 *
 * Gratuit, sans compte, sans clé, sans quota — et **en français**, ce qu'aucune
 * API de recettes commerciale ne propose, y compris payante. Les pages sont
 * sous CC BY-SA : on les lit à la volée et on cite la source, comme un
 * navigateur, plutôt que d'en recopier un corpus.
 */
@Injectable()
export class WikibooksCatalogue implements Catalogue {
  async search(query: string, limit: number): Promise<CatalogueEntry[]> {
    const search = await this.call({
      action: 'query',
      list: 'search',
      // Le préfixe cantonne la recherche au livre de cuisine : sans lui on
      // remonterait des pages de grammaire.
      srsearch: `${query} prefix:"${BOOK}"`,
      srlimit: String(limit),
    });

    const hits = (search as { query?: { search?: { title: string }[] } }).query
      ?.search;

    return (hits ?? []).map((hit) => ({ ref: hit.title }));
  }

  async fetch(refs: string[]): Promise<Map<string, string>> {
    const pages = new Map<string, string>();
    if (refs.length === 0) return pages;

    // Un seul appel pour toutes les pages : MediaWiki en accepte cinquante,
    // et trier les résultats par ce qui manque exige leurs ingrédients.
    const result = await this.call({
      action: 'query',
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      titles: refs.join('|'),
    });

    const list = (
      result as {
        query?: {
          pages?: {
            title: string;
            revisions?: { slots?: { main?: { content?: string } } }[];
          }[];
        };
      }
    ).query?.pages;

    for (const page of list ?? []) {
      const content = page.revisions?.[0]?.slots?.main?.content;
      if (content) pages.set(page.title, content);
    }

    return pages;
  }

  private async call(params: Record<string, string>): Promise<unknown> {
    const url = `${API}?${new URLSearchParams({
      ...params,
      format: 'json',
      formatversion: '2',
    }).toString()}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Wikimedia demande un agent identifiable — sans lui, on se fait limiter.
      headers: { 'User-Agent': 'Restock/1.0 (inventaire partagé)' },
    });

    if (!response.ok) return {};

    return response.json();
  }
}
