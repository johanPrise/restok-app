import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

/**
 * Configuration partagée entre `main.ts` et les tests e2e.
 *
 * Sans ça les e2e tourneraient sans ValidationPipe et ne verraient jamais les
 * 400 que la production renvoie.
 */
export function configureApp(app: INestApplication): INestApplication {
  /**
   * Les en-têtes que tout serveur devrait poser et qu'aucun ne pose seul.
   *
   * `contentSecurityPolicy` est laissée par défaut : l'API ne rend que du JSON
   * et un CSV, jamais de HTML, donc rien qu'un navigateur exécuterait.
   */
  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  enableCors(app);

  return app;
}

/**
 * Un client React Native n'est pas soumis au CORS, mais un navigateur l'est —
 * et l'app Expo tourne aussi sur le web, ne serait-ce que pour être inspectée
 * pendant le développement. Sans ça la requête ne part même pas.
 *
 * `CORS_ORIGINS` liste les origines autorisées, séparées par des virgules. En
 * production, une valeur vide **refuse tout** plutôt que d'ouvrir à `*` : le
 * défaut permissif ne vaut qu'en développement.
 */
function enableCors(app: INestApplication): void {
  const origins = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins?.length) {
    app.enableCors({ origin: origins, credentials: true });
    return;
  }

  if (process.env.NODE_ENV === 'production') return;

  app.enableCors({ origin: true });
}
