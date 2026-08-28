import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * « Mot de passe oublié » : la table des demandes, et la date qui coupe les
 * sessions ouvertes avec l'ancien mot de passe.
 *
 * `code_hash` et non le code : une base qui fuite ne doit pas livrer des
 * prises de contrôle. C'est un hash bcrypt, qu'on ne peut pas interroger —
 * d'où l'index sur `member_id`, seule porte d'entrée de la table.
 *
 * `password_changed_at` est nullable : les comptes créés avant cette migration
 * n'ont pas de sessions à invalider, et une date arbitraire les aurait tous
 * déconnectés au déploiement.
 */
export class PasswordReset1787420000000 implements MigrationInterface {
  name = 'PasswordReset1787420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "member" ADD "password_changed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE TABLE "password_reset" (
         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
         "member_id" uuid NOT NULL,
         "code_hash" character varying(255) NOT NULL,
         "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
         "attempts" integer NOT NULL DEFAULT 0,
         "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
         CONSTRAINT "PK_password_reset" PRIMARY KEY ("id")
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_password_reset_member" ON "password_reset" ("member_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset"
         ADD CONSTRAINT "FK_password_reset_member"
         FOREIGN KEY ("member_id") REFERENCES "member"("id")
         ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "password_reset" DROP CONSTRAINT "FK_password_reset_member"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_password_reset_member"`);
    await queryRunner.query(`DROP TABLE "password_reset"`);
    await queryRunner.query(
      `ALTER TABLE "member" DROP COLUMN "password_changed_at"`,
    );
  }
}
