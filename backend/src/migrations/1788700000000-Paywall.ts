import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Le palier payant : une preuve de paiement, et un déblocage porté par le groupe.
 *
 * Les deux sont séparés à dessein. `purchase` dit qui a payé et reste
 * indéfiniment ; `group.unlocked_by_purchase_id` dit quel groupe en profite.
 * Un acheteur qui quitte son groupe ne remporte donc pas le déblocage, et il
 * garde de quoi débloquer un groupe suivant.
 *
 * `store_transaction_id` est unique : c'est la clé d'idempotence des webhooks,
 * qui sont rejoués. Sans elle, un même achat créerait deux lignes.
 *
 * `ON DELETE SET NULL` sur le déblocage : si un achat disparaissait — un
 * remboursement, un nettoyage — le groupe retomberait sur le palier gratuit
 * sans que la ligne du groupe devienne invalide.
 */
export class Paywall1788700000000 implements MigrationInterface {
  name = 'Paywall1788700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "purchase" (
         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
         "member_id" uuid NOT NULL,
         "product_id" character varying(100) NOT NULL,
         "store" character varying(40) NOT NULL,
         "store_transaction_id" character varying(255) NOT NULL,
         "purchased_at" TIMESTAMP WITH TIME ZONE NOT NULL,
         "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
         CONSTRAINT "UQ_purchase_store_transaction" UNIQUE ("store_transaction_id"),
         CONSTRAINT "PK_purchase" PRIMARY KEY ("id")
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_purchase_member" ON "purchase" ("member_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase"
         ADD CONSTRAINT "FK_purchase_member"
         FOREIGN KEY ("member_id") REFERENCES "member"("id")
         ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "group" ADD "unlocked_by_purchase_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "group"
         ADD CONSTRAINT "FK_group_unlocked_by_purchase"
         FOREIGN KEY ("unlocked_by_purchase_id") REFERENCES "purchase"("id")
         ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "group" DROP CONSTRAINT "FK_group_unlocked_by_purchase"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group" DROP COLUMN "unlocked_by_purchase_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase" DROP CONSTRAINT "FK_purchase_member"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_purchase_member"`);
    await queryRunner.query(`DROP TABLE "purchase"`);
  }
}
