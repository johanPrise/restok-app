import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { MAIL_PROVIDER } from '../src/mail/mail-provider.interface';
import { createE2EApp, E2EContext } from './utils/e2e-app';
import { RecordingMailProvider } from './utils/recording-mail.provider';

/**
 * Les sessions longues, contre une vraie base.
 *
 * Ce que les tests unitaires ne peuvent pas montrer et qui compte ici :
 * l'unicité du hash, la cascade depuis `member`, et surtout le fait qu'un
 * access token obtenu par rotation ouvre réellement les routes protégées —
 * c'est la seule chose que quiconque remarque si elle casse.
 */
describe('Refresh (e2e)', () => {
  let ctx: E2EContext;
  let app: INestApplication;
  let dataSource: DataSource;
  let mail: RecordingMailProvider;

  const credentials = {
    name: 'Yorick',
    email: 'yorick@test.dev',
    password: 'motdepasse123',
  };

  beforeAll(async () => {
    ctx = await createE2EApp();
    app = ctx.app;
    dataSource = app.get(DataSource);
    mail = app.get<RecordingMailProvider>(MAIL_PROVIDER);
  });

  beforeEach(async () => {
    await ctx.reset();
    mail.clear();
  });
  afterAll(() => ctx.close());

  const post = (path: string) => request(app.getHttpServer()).post(path);

  /** Inscrit le compte de test et rend sa première paire de tokens. */
  async function signUp(): Promise<{ accessToken: string; refresh: string }> {
    const res = await post('/auth/register').send(credentials).expect(201);

    return {
      accessToken: res.body.accessToken as string,
      refresh: res.body.refreshToken as string,
    };
  }

  /**
   * Recule la révocation d'un token dans le passé.
   *
   * La détection de vol ne se déclenche qu'au-delà de la fenêtre de grâce, que
   * ces tests franchiraient sinon en quelques millisecondes. Attendre trente
   * secondes pour l'observer rendrait la suite inutilisable.
   */
  async function backdateRevocation(minutes: number): Promise<void> {
    await dataSource.query(
      `UPDATE refresh_token
         SET revoked_at = now() - ($1 || ' minutes')::interval
       WHERE revoked_at IS NOT NULL`,
      [String(minutes)],
    );
  }

  describe("l'ouverture de session", () => {
    it('rend un refresh token à l’inscription', async () => {
      const res = await post('/auth/register').send(credentials).expect(201);

      expect(res.body.refreshToken).toEqual(expect.any(String));
    });

    it('en rend un à la connexion', async () => {
      await post('/auth/register').send(credentials).expect(201);

      const res = await post('/auth/login')
        .send({ email: credentials.email, password: credentials.password })
        .expect(200);

      expect(res.body.refreshToken).toEqual(expect.any(String));
    });

    it('ne le stocke jamais en clair', async () => {
      const { refresh } = await signUp();

      const rows = await dataSource.query(
        'SELECT token_hash FROM refresh_token',
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].token_hash).not.toBe(refresh);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rend un access token qui ouvre vraiment les routes protégées', async () => {
      const { refresh } = await signUp();

      const res = await post('/auth/refresh')
        .send({ refreshToken: refresh })
        .expect(200);

      // Le seul test qui compte : la session continue pour de bon.
      await request(app.getHttpServer())
        .post('/groups')
        .set('Authorization', `Bearer ${res.body.accessToken as string}`)
        .send({ name: 'Coloc de test' })
        .expect(201);
    });

    it('fait tourner le refresh token', async () => {
      const { refresh } = await signUp();

      const res = await post('/auth/refresh')
        .send({ refreshToken: refresh })
        .expect(200);

      expect(res.body.refreshToken).not.toBe(refresh);
    });

    it('enchaîne les rotations sans jamais redemander le mot de passe', async () => {
      let { refresh } = await signUp();

      for (let i = 0; i < 3; i++) {
        const res = await post('/auth/refresh')
          .send({ refreshToken: refresh })
          .expect(200);
        refresh = res.body.refreshToken as string;
      }

      expect(refresh).toEqual(expect.any(String));
    });

    it("renvoie l'état du membre, qui a pu changer depuis la connexion", async () => {
      const { accessToken, refresh } = await signUp();

      await request(app.getHttpServer())
        .post('/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Coloc de test' })
        .expect(201);

      const res = await post('/auth/refresh')
        .send({ refreshToken: refresh })
        .expect(200);

      // L'app garde le membre en cache faute d'endpoint « qui suis-je » : le
      // rafraîchissement est justement l'occasion de le remettre à jour.
      expect(res.body.member.groupId).toEqual(expect.any(String));
      expect(res.body.member.role).toBe('admin');
    });

    it('refuse un token inconnu', async () => {
      await post('/auth/refresh')
        .send({ refreshToken: 'a'.repeat(43) })
        .expect(401);
    });

    it('refuse un corps qui ne ressemble pas à un token', async () => {
      await post('/auth/refresh').send({ refreshToken: 'court' }).expect(400);
    });
  });

  describe('la réutilisation', () => {
    it('tolère un rejeu immédiat — la réponse a pu se perdre', async () => {
      const { refresh } = await signUp();

      await post('/auth/refresh').send({ refreshToken: refresh }).expect(200);

      // Le client n'a jamais reçu le token émis : le déconnecter pour du
      // mauvais réseau serait le défaut qu'on cherchait à corriger.
      await post('/auth/refresh').send({ refreshToken: refresh }).expect(200);
    });

    it('coupe tout quand un token consommé revient bien plus tard', async () => {
      const { refresh } = await signUp();

      const res = await post('/auth/refresh')
        .send({ refreshToken: refresh })
        .expect(200);
      const courant = res.body.refreshToken as string;

      await backdateRevocation(5);

      await post('/auth/refresh').send({ refreshToken: refresh }).expect(401);

      // Et le token courant tombe avec : on ignore lequel des deux détenteurs
      // est le voleur, seul le mot de passe permet de trancher.
      await post('/auth/refresh').send({ refreshToken: courant }).expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('ferme la session pour de bon', async () => {
      const { refresh } = await signUp();

      await post('/auth/logout').send({ refreshToken: refresh }).expect(204);

      // Sans le cas « révoqué sans remplaçant », la fenêtre de grâce aurait
      // rendu ici un token neuf : la déconnexion n'aurait tenu que trente
      // secondes.
      await post('/auth/refresh').send({ refreshToken: refresh }).expect(401);
    });

    it('reste muet sur un token inconnu', async () => {
      // Le contraire ferait de cette route un oracle : on saurait, en la
      // questionnant, quels tokens existent.
      await post('/auth/logout')
        .send({ refreshToken: 'a'.repeat(43) })
        .expect(204);
    });

    it("laisse l'access token en cours vivre sa dernière heure", async () => {
      const { accessToken, refresh } = await signUp();

      await post('/auth/logout').send({ refreshToken: refresh }).expect(204);

      // C'est la contrepartie assumée d'un JWT qu'aucune requête ne valide :
      // seul le renouvellement est fermé, pas le jeton déjà émis. L'app efface
      // sa session de son côté, donc personne ne le rejoue.
      await request(app.getHttpServer())
        .post('/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Coloc de test' })
        .expect(201);
    });
  });

  describe('le changement de mot de passe', () => {
    it('coupe les sessions longues, que la date ne périme pas', async () => {
      const { refresh } = await signUp();

      await post('/auth/forgot-password')
        .send({ email: credentials.email })
        .expect(204);

      const code = sentCode();

      await post('/auth/reset-password')
        .send({
          email: credentials.email,
          code,
          password: 'nouveaumotdepasse',
        })
        .expect(200);

      // `passwordChangedAt` ne refuse que les JWT antérieurs. Sans révocation
      // explicite, l'intrus gardait de quoi se refabriquer des access tokens
      // pendant deux mois — la réinitialisation n'aurait fermé qu'une porte
      // sur deux.
      await post('/auth/refresh').send({ refreshToken: refresh }).expect(401);
    });

    it('en ouvre une neuve dans la foulée', async () => {
      await signUp();

      await post('/auth/forgot-password')
        .send({ email: credentials.email })
        .expect(204);

      const code = sentCode();

      const res = await post('/auth/reset-password')
        .send({
          email: credentials.email,
          code,
          password: 'nouveaumotdepasse',
        })
        .expect(200);

      await post('/auth/refresh')
        .send({ refreshToken: res.body.refreshToken as string })
        .expect(200);
    });
  });

  /** Le code tel qu'il part dans l'email — huit caractères de l'alphabet. */
  const sentCode = () => /[A-Z2-9]{8}/.exec(mail.last()!.text)![0];
});
