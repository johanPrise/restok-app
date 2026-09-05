import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * De quoi supprimer son compte, et de quoi désigner qui reprend les clés.
 *
 * `joined_at` manquait pour une raison simple : jusqu'ici personne n'avait
 * besoin de savoir *quand* on était entré dans un groupe. La succession, elle,
 * en a besoin — sans elle, « le membre présent depuis le plus longtemps » se
 * calculait sur `created_at`, qui date la création du **compte** et non
 * l'entrée dans le groupe. Quelqu'un inscrit il y a un an mais arrivé hier
 * aurait hérité devant un membre présent depuis six mois.
 *
 * Le remplissage reprend `created_at` faute de mieux : c'est la seule
 * information qu'on ait sur les groupes déjà formés, et l'ordre reste plausible
 * dans un foyer dont les membres se sont inscrits pour l'occasion. Seuls les
 * membres rattachés à un groupe sont concernés — pour les autres, il n'y a rien
 * à dater.
 */
export class AccountDeletion1788617000000 implements MigrationInterface {
  name = 'AccountDeletion1788617000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "member" ADD "joined_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `UPDATE "member" SET "joined_at" = "created_at" WHERE "group_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "member" DROP COLUMN "joined_at"`);
  }
}
