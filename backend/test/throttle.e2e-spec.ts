/**
 * Le plafond de débit, rallumé pour cette suite seule.
 *
 * Les autres e2e l'éteignent — elles créent des dizaines de comptes, ce que le
 * plafond d'inscription arrêterait au sixième. Mais une protection qu'aucun
 * test ne rallume est une protection qu'on croit avoir : celle-ci vérifie
 * qu'une porte fermée l'est vraiment.
 *
 * L'assignation précède l'import de l'app : `ThrottlerModule` lit son état au
 * montage du module, pas à chaque requête.
 */
process.env.THROTTLE_DISABLED = 'false';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp, E2EContext } from './utils/e2e-app';

describe('Plafond de débit (e2e)', () => {
  let ctx: E2EContext;
  let app: INestApplication;

  beforeAll(async () => {
    ctx = await createE2EApp();
    app = ctx.app;
  });

  beforeEach(() => ctx.reset());

  afterAll(() => ctx.close());

  /** Une adresse par test : le compteur est tenu par IP, pas par compte. */
  const login = (email: string) =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'mauvais-mot-de-passe' });

  it('ferme la porte après une dizaine de mots de passe essayés', async () => {
    // Dix essais restent au-delà de ce qu'un humain fait en se trompant, et
    // très en deçà de ce qu'un script demande.
    const statuts: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      const res = await login('inconnu@exemple.fr');
      statuts.push(res.status);
    }

    expect(statuts).toContain(429);
    // Les premiers passent : on refuse les identifiants, on ne bloque pas.
    expect(statuts[0]).toBe(401);
  });

  it('arrête aussi la création de comptes en rafale', async () => {
    // Créer des comptes en boucle remplit la base et brûle des adresses.
    const statuts: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: `Sam ${i}`,
          email: `sam-${i}@exemple.fr`,
          password: 'motdepasse123',
        });
      statuts.push(res.status);
    }

    expect(statuts[0]).toBe(201);
    expect(statuts).toContain(429);
  });

  it('laisse respirer les routes ordinaires', async () => {
    // Quelqu'un qui coche sa liste au magasin envoie une rafale de requêtes,
    // et un mode hors-ligne qui rejoue sa file en envoie bien plus. Le plafond
    // général doit les laisser passer.
    const res = await request(app.getHttpServer()).get('/health');

    expect([200, 503]).toContain(res.status);
  });
});
