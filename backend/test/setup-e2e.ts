/**
 * Bascule les e2e sur une base dédiée avant que ConfigModule ne lise
 * l'environnement.
 *
 * `dotenv` n'écrase jamais une variable déjà présente dans `process.env`, donc
 * ces valeurs gagnent sur le `.env` de développement — les tests ne peuvent pas
 * tronquer la base de travail.
 */
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME_TEST ?? 'restock_test';
process.env.JWT_SECRET ??= 'secret-de-test-e2e';
process.env.JWT_EXPIRES_IN ??= '1h';

/**
 * Le plafond de débit est éteint par défaut dans les e2e : la suite crée des
 * dizaines de comptes en quelques secondes, ce que le plafond d'inscription
 * arrêterait au sixième. `throttle.e2e-spec.ts` le rallume pour lui seul.
 */
process.env.THROTTLE_DISABLED ??= 'true';

// Aucune requête ne doit sortir vers l'API Expo : le provider est de toute
// façon remplacé par un faux, ceci est la ceinture en plus des bretelles.
process.env.EXPO_PUSH_URL = 'http://127.0.0.1:1/never-called';
