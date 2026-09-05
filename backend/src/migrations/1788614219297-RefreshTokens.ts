import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Les sessions longues : une ligne par session ouverte.
 *
 * `token_hash` est unique et indexé, parce que c'est la **seule** porte
 * d'entrée : le client n'envoie que le token, rien d'autre ne dit de qui il
 * parle. C'est un SHA-256 et non un bcrypt comme les codes de
 * réinitialisation, précisément pour cette raison — un hash bcrypt ne
 * s'interroge pas. Voir l'entité pour le reste de l'argument.
 *
 * `revoked_at` plutôt qu'une suppression : une ligne effacée ne se distingue
 * plus d'un token jamais émis, et c'est justement cette distinction qui rend un
 * vol visible.
 *
 * `replaced_by_id` référence la même table — d'où le `ON DELETE SET NULL` : la
 * purge des lignes expirées ne doit pas se heurter à l'ordre dans lequel une
 * chaîne de rotations a été écrite.
 */
export class RefreshTokens1788614219297 implements MigrationInterface {
  name = 'RefreshTokens1788614219297';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "refresh_token" (
         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
         "member_id" uuid NOT NULL,
         "token_hash" character(64) NOT NULL,
         "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
         "revoked_at" TIMESTAMP WITH TIME ZONE,
         "replaced_by_id" uuid,
         "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
         CONSTRAINT "UQ_refresh_token_hash" UNIQUE ("token_hash"),
         CONSTRAINT "PK_refresh_token" PRIMARY KEY ("id")
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_token_member" ON "refresh_token" ("member_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token"
         ADD CONSTRAINT "FK_refresh_token_member"
         FOREIGN KEY ("member_id") REFERENCES "member"("id")
         ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token"
         ADD CONSTRAINT "FK_refresh_token_replaced_by"
         FOREIGN KEY ("replaced_by_id") REFERENCES "refresh_token"("id")
         ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_token" DROP CONSTRAINT "FK_refresh_token_replaced_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" DROP CONSTRAINT "FK_refresh_token_member"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_refresh_token_member"`);
    await queryRunner.query(`DROP TABLE "refresh_token"`);
  }
}
