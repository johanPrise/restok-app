import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1786975426490 implements MigrationInterface {
  name = 'InitialSchema1786975426490';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."member_role" AS ENUM('admin', 'member')`,
    );
    await queryRunner.query(
      `CREATE TABLE "member" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "email" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "role" "public"."member_role" NOT NULL DEFAULT 'member', "push_token" character varying(255), "group_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_4678079964ab375b2b31849456c" UNIQUE ("email"), CONSTRAINT "PK_97cbbe986ce9d14ca5894fdc072" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_member_group" ON "member"  ("group_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."group_type" AS ENUM('roommates', 'association')`,
    );
    await queryRunner.query(
      `CREATE TABLE "group" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "type" "public"."group_type" NOT NULL DEFAULT 'roommates', "invite_code" character varying(8) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_aaeb14e9a2dade7d0fb0ee38b67" UNIQUE ("invite_code"), CONSTRAINT "PK_256aa0fda9b1de1a73ee0b7106b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_aaeb14e9a2dade7d0fb0ee38b6" ON "group"  ("invite_code") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."item_status" AS ENUM('available', 'low', 'out_of_stock', 'to_restock')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tracking_type" AS ENUM('threshold', 'quantity')`,
    );
    await queryRunner.query(
      `CREATE TABLE "item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "status" "public"."item_status" NOT NULL DEFAULT 'available', "tracking_type" "public"."tracking_type" NOT NULL DEFAULT 'threshold', "quantity" integer, "low_threshold" integer DEFAULT '1', "target_quantity" integer, "unit" character varying(20), "pack_size" integer, "format" character varying(20), "group_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_d3c0c71f23e7adcf952a1d13423" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_item_status" ON "item"  ("group_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_item_group" ON "item"  ("group_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."action_type" AS ENUM('taken', 'restocked')`,
    );
    await queryRunner.query(
      `CREATE TABLE "action_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "item_id" uuid NOT NULL, "member_id" uuid NOT NULL, "action_type" "public"."action_type" NOT NULL, "quantity" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ca1fdf2edcf542ad46702522633" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_history_member" ON "action_history"  ("member_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_history_item" ON "action_history"  ("item_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "shopping_line" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "group_id" uuid NOT NULL, "item_id" uuid, "label" character varying(100), "quantity" integer, "checked" boolean NOT NULL DEFAULT false, "checked_by_id" uuid, "checked_at" TIMESTAMP WITH TIME ZONE, "added_by_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_shopping_item" UNIQUE ("group_id", "item_id"), CONSTRAINT "PK_d01c0529f415e9b7ad3f1c5e109" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_shopping_group" ON "shopping_line"  ("group_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "member" ADD CONSTRAINT "FK_790852db0d7a31e1cd3af00af1e" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "item" ADD CONSTRAINT "FK_6b0100c5cb7c67d99ae46197727" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "action_history" ADD CONSTRAINT "FK_c022c1ca30e275545ce6547db4f" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "action_history" ADD CONSTRAINT "FK_6e7f8bbe69f8fc2a2ff66e9d9ae" FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shopping_line" ADD CONSTRAINT "FK_92a47a994535aab96a824925e30" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shopping_line" ADD CONSTRAINT "FK_afd46da88e34e63f6fffe08b13b" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shopping_line" ADD CONSTRAINT "FK_f2f027812d27e3f8d87457c2b16" FOREIGN KEY ("checked_by_id") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shopping_line" ADD CONSTRAINT "FK_edb751008ef737ce35f894b82c1" FOREIGN KEY ("added_by_id") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shopping_line" DROP CONSTRAINT "FK_edb751008ef737ce35f894b82c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shopping_line" DROP CONSTRAINT "FK_f2f027812d27e3f8d87457c2b16"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shopping_line" DROP CONSTRAINT "FK_afd46da88e34e63f6fffe08b13b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shopping_line" DROP CONSTRAINT "FK_92a47a994535aab96a824925e30"`,
    );
    await queryRunner.query(
      `ALTER TABLE "action_history" DROP CONSTRAINT "FK_6e7f8bbe69f8fc2a2ff66e9d9ae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "action_history" DROP CONSTRAINT "FK_c022c1ca30e275545ce6547db4f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "item" DROP CONSTRAINT "FK_6b0100c5cb7c67d99ae46197727"`,
    );
    await queryRunner.query(
      `ALTER TABLE "member" DROP CONSTRAINT "FK_790852db0d7a31e1cd3af00af1e"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_shopping_group"`);
    await queryRunner.query(`DROP TABLE "shopping_line"`);
    await queryRunner.query(`DROP INDEX "public"."idx_history_item"`);
    await queryRunner.query(`DROP INDEX "public"."idx_history_member"`);
    await queryRunner.query(`DROP TABLE "action_history"`);
    await queryRunner.query(`DROP TYPE "public"."action_type"`);
    await queryRunner.query(`DROP INDEX "public"."idx_item_group"`);
    await queryRunner.query(`DROP INDEX "public"."idx_item_status"`);
    await queryRunner.query(`DROP TABLE "item"`);
    await queryRunner.query(`DROP TYPE "public"."tracking_type"`);
    await queryRunner.query(`DROP TYPE "public"."item_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_aaeb14e9a2dade7d0fb0ee38b6"`,
    );
    await queryRunner.query(`DROP TABLE "group"`);
    await queryRunner.query(`DROP TYPE "public"."group_type"`);
    await queryRunner.query(`DROP INDEX "public"."idx_member_group"`);
    await queryRunner.query(`DROP TABLE "member"`);
    await queryRunner.query(`DROP TYPE "public"."member_role"`);
  }
}
