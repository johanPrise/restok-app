/**
 * L'accès au catalogue de recettes.
 *
 * Isolé derrière une interface pour deux raisons : les tests ne doivent jamais
 * sortir sur le réseau, et la source peut changer sans que le service des
 * recettes s'en aperçoive.
 */
export interface CatalogueEntry {
  /** L'identifiant chez la source — ici le titre de la page. */
  ref: string;
}

export interface Catalogue {
  search(query: string, limit: number): Promise<CatalogueEntry[]>;
  /** Le wikitexte de chaque page demandée, indexé par `ref`. */
  fetch(refs: string[]): Promise<Map<string, string>>;
}

export const CATALOGUE = Symbol('CATALOGUE');
