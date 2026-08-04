import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export interface TestMember {
  token: string;
  id: string;
  name: string;
  email: string;
}

let counter = 0;

/** Fait remonter le corps de la réponse dans le message d'échec. */
function expectStatus(
  res: request.Response,
  status: number,
  what: string,
): void {
  if (res.status !== status) {
    throw new Error(
      `${what} : attendu ${status}, reçu ${res.status} — ${JSON.stringify(res.body)}`,
    );
  }
}

/** Inscrit un membre et renvoie son token. */
export async function signUp(
  app: INestApplication,
  name: string,
): Promise<TestMember> {
  const email = `${name.toLowerCase()}-${counter++}@test.dev`;

  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ name, email, password: 'motdepasse123' });
  expectStatus(res, 201, `inscription de ${name}`);

  return {
    token: res.body.accessToken as string,
    id: res.body.member.id as string,
    name,
    email,
  };
}

export function auth(app: INestApplication, member: TestMember) {
  const agent = request(app.getHttpServer());
  const bearer = `Bearer ${member.token}`;

  return {
    get: (path: string) => agent.get(path).set('Authorization', bearer),
    post: (path: string) => agent.post(path).set('Authorization', bearer),
    patch: (path: string) => agent.patch(path).set('Authorization', bearer),
    delete: (path: string) => agent.delete(path).set('Authorization', bearer),
  };
}

/** Crée un groupe avec `owner` comme admin et y fait entrer `members`. */
export async function createGroupWith(
  app: INestApplication,
  owner: TestMember,
  members: TestMember[] = [],
): Promise<{ id: string; inviteCode: string }> {
  const res = await auth(app, owner)
    .post('/groups')
    .send({ name: 'Coloc de test' })
    .expect(201);

  const group = res.body as { id: string; inviteCode: string };

  for (const member of members) {
    await auth(app, member)
      .post('/groups/join')
      .send({ inviteCode: group.inviteCode })
      .expect(200);
  }

  return group;
}

export async function registerPushToken(
  app: INestApplication,
  member: TestMember,
  pushToken: string,
): Promise<void> {
  const res = await auth(app, member)
    .patch('/members/me/push-token')
    .send({ pushToken });
  expectStatus(res, 204, `push token de ${member.name}`);
}
