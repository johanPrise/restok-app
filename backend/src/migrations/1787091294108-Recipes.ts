import { MigrationInterface, QueryRunner } from 'typeorm';

export class Recipes1787091294108 implements MigrationInterface {
  name = 'Recipes1787091294108';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "recipe_ingredient" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "recipe_id" uuid NOT NULL, "item_id" uuid, "position" integer NOT NULL DEFAULT '0', "label" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_ingredient_item" UNIQUE ("recipe_id", "item_id"), CONSTRAINT "PK_a13ac3f2cebdd703ac557c5377c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ingredient_item" ON "recipe_ingredient"  ("item_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ingredient_recipe" ON "recipe_ingredient"  ("recipe_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "recipe" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "group_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "source" character varying(500), "description" text, "servings" integer, "created_by_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_e365a2fedf57238d970e07825ca" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_recipe_group" ON "recipe"  ("group_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "recipe_ingredient" ADD CONSTRAINT "FK_256c22ec24d2d590b39e11a3ee4" FOREIGN KEY ("recipe_id") REFERENCES "recipe"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipe_ingredient" ADD CONSTRAINT "FK_ef0f54d41d158a890e6b2db71b7" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipe" ADD CONSTRAINT "FK_d7e296af4612818fa55a2900825" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipe" ADD CONSTRAINT "FK_590a7ede186360d680cdef3dad0" FOREIGN KEY ("created_by_id") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recipe" DROP CONSTRAINT "FK_590a7ede186360d680cdef3dad0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipe" DROP CONSTRAINT "FK_d7e296af4612818fa55a2900825"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipe_ingredient" DROP CONSTRAINT "FK_ef0f54d41d158a890e6b2db71b7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipe_ingredient" DROP CONSTRAINT "FK_256c22ec24d2d590b39e11a3ee4"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_recipe_group"`);
    await queryRunner.query(`DROP TABLE "recipe"`);
    await queryRunner.query(`DROP INDEX "public"."idx_ingredient_recipe"`);
    await queryRunner.query(`DROP INDEX "public"."idx_ingredient_item"`);
    await queryRunner.query(`DROP TABLE "recipe_ingredient"`);
  }
}
