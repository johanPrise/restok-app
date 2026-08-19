/**
 * Le jeton d'injection du récupérateur de pages.
 *
 * Il existe pour que les tests remplacent l'accès réseau par une fixture : une
 * suite qui appellerait Marmiton pour de vrai échouerait le jour où le site
 * change, ou quand on la lance dans un train.
 */
export const PAGE_FETCHER = Symbol('PAGE_FETCHER');
