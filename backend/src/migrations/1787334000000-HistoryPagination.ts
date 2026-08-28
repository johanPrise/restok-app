import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * L'index qui rend la pagination du journal tenable en profondeur.
 *
 * Le journal se lit du plus récent au plus ancien, et se pagine sur le couple
 * `(created_at, id)` — la date seule n'est pas unique, clôturer des courses
 * écrivant plusieurs rachats dans la même milliseconde.
 *
 * Sans index sur ce couple, chaque page retrie l'intégralité de l'historique
 * du groupe pour n'en garder que cinquante lignes : la pagination marcherait,
 * mais elle ralentirait à mesure qu'on descend — c'est-à-dire précisément là
 * où elle sert.
 *
 * L'index est déclaré **sans `DESC`**, alors que la requête lit du plus récent
 * au plus ancien. Un B-tree se parcourt dans les deux sens, et le sens ne
 * compte que pour un tri mixte — `created_at DESC, id ASC` — que nous n'avons
 * pas. En le laissant simple, il est identique à celui que `synchronize` pose
 * en développement et dans les tests, et les deux schémas ne divergent pas.
 */
export class HistoryPagination1787334000000 implements MigrationInterface {
  name = 'HistoryPagination1787334000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "idx_history_page" ON "action_history" ("created_at", "id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_history_page"`);
  }
}
