import { INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Configuration partagée entre `main.ts` et les tests e2e.
 *
 * Sans ça les e2e tourneraient sans ValidationPipe et ne verraient jamais les
 * 400 que la production renvoie.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  return app;
}
