import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MAIL_PROVIDER } from '../src/mail/mail-provider.interface';
import { signUp, TestMember } from './utils/api';
import { createE2EApp, E2EContext } from './utils/e2e-app';
import { RecordingMailProvider } from './utils/recording-mail.provider';

describe('Mot de passe oublié (e2e)', () => {
  let ctx: E2EContext;
  let app: INestApplication;
  let mail: RecordingMailProvider;
  let sam: TestMember;

  beforeAll(async () => {
    ctx = await createE2EApp();
    app = ctx.app;
    mail = app.get<RecordingMailProvider>(MAIL_PROVIDER);
  });

  beforeEach(async () => {
    await ctx.reset();
    mail.clear();
    sam = await signUp(app, 'Sam');
  });

  afterAll(() => ctx.close());

  const forgot = (email: string) =>
    request(app.getHttpServer()).post('/auth/forgot-password').send({ email });

  const reset = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/auth/reset-password').send(body);

  /** Le code tel qu'il part dans l'email — huit caractères de l'alphabet. */
  const sentCode = () => /[A-Z2-9]{8}/.exec(mail.last()!.text)![0];

  describe('la demande', () => {
    it('envoie un code à qui a un compte', async () => {
      await forgot(sam.email).expect(204);

      expect(mail.messages).toHaveLength(1);
      expect(mail.last()!.to).toBe(sam.email);
      expect(sentCode()).toHaveLength(8);
    });

    it('répond pareil à une adresse inconnue, et n’envoie rien', async () => {
      // Distinguer les deux ferait de cette route un annuaire des comptes.
      await forgot('personne@exemple.fr').expect(204);

      expect(mail.messages).toHaveLength(0);
    });

    it('ne garde qu’un code vivant à la fois', async () => {
      await forgot(sam.email).expect(204);
      const premier = sentCode();
      await forgot(sam.email).expect(204);

      // Deux codes valides doubleraient la surface d'attaque pour rien.
      await reset({
        email: sam.email,
        code: premier,
        password: 'nouveaumotdepasse',
      }).expect(400);
    });
  });

  describe('la réinitialisation', () => {
    it('accepte le code et ouvre une session dans la foulée', async () => {
      await forgot(sam.email).expect(204);

      const res = await reset({
        email: sam.email,
        code: sentCode(),
        password: 'nouveaumotdepasse',
      }).expect(200);

      // Renvoyer au formulaire ferait retaper à l'instant le mot de passe
      // qu'on vient de choisir, sur l'écran dont on sortait justement.
      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    it('laisse se connecter avec le nouveau, plus avec l’ancien', async () => {
      await forgot(sam.email).expect(204);
      await reset({
        email: sam.email,
        code: sentCode(),
        password: 'nouveaumotdepasse',
      }).expect(200);

      const login = (password: string) =>
        request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: sam.email, password });

      await login('nouveaumotdepasse').expect(200);
      await login('motdepasse123').expect(401);
    });

    it('brûle le code après usage', async () => {
      await forgot(sam.email).expect(204);
      const code = sentCode();

      await reset({
        email: sam.email,
        code,
        password: 'nouveaumotdepasse',
      }).expect(200);
      await reset({
        email: sam.email,
        code,
        password: 'encore-un-autre',
      }).expect(400);
    });

    it('refuse un code faux sans dire lequel des deux a manqué', async () => {
      await forgot(sam.email).expect(204);

      const res = await reset({
        email: sam.email,
        code: 'AAAAAAAA',
        password: 'nouveaumotdepasse',
      }).expect(400);

      // Un seul refus pour tous les cas : le distinguer apprendrait à un
      // attaquant où il en est.
      expect(res.body.code).toBe('reset_code_invalid');
    });

    it('ferme la demande après cinq essais', async () => {
      // Le plafond de débit compte par adresse ; celui-ci par demande, ce qui
      // ferme la porte à qui répartirait ses essais.
      await forgot(sam.email).expect(204);
      const bon = sentCode();

      for (let i = 0; i < 5; i += 1) {
        await reset({
          email: sam.email,
          code: 'BBBBBBBB',
          password: 'nouveaumotdepasse',
        }).expect(400);
      }

      await reset({
        email: sam.email,
        code: bon,
        password: 'nouveaumotdepasse',
      }).expect(400);
    });

    it('refuse un mot de passe trop court', async () => {
      await forgot(sam.email).expect(204);

      await reset({
        email: sam.email,
        code: sentCode(),
        password: 'court',
      }).expect(400);
    });
  });

  describe('les sessions ouvertes', () => {
    it('coupe celles qui datent d’avant le changement', async () => {
      // Sans ça, une réinitialisation ne reprendrait pas le compte à qui s'y
      // était introduit : il garderait sa session jusqu'à expiration.
      const ancien = sam.token;

      // Une seconde pleine : `iat` est en secondes, et la stratégie accorde
      // celle du changement pour ne pas couper qui vient d'agir.
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await forgot(sam.email).expect(204);
      await reset({
        email: sam.email,
        code: sentCode(),
        password: 'nouveaumotdepasse',
      }).expect(200);

      await request(app.getHttpServer())
        .get('/groups/me')
        .set('Authorization', `Bearer ${ancien}`)
        .expect(401);
    });
  });
});
