/**
 * Le nom de la table qui retient les migrations déjà jouées.
 *
 * Partagé entre l'application et la CLI : si les deux ne regardaient pas la
 * même table, la prod rejouerait au démarrage des migrations que la CLI croit
 * appliquées.
 */
export const MIGRATIONS_TABLE = 'migrations';
