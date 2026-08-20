import { MigrationInterface, QueryRunner } from 'typeorm';

export class SoloGroups1787248489057 implements MigrationInterface {
  name = 'SoloGroups1787248489057';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."group_type" ADD VALUE 'solo'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."group_type_old" AS ENUM('roommates', 'association')`,
    );
    await queryRunner.query(
      `ALTER TABLE "group" ALTER COLUMN "type" TYPE "public"."group_type_old" USING "type"::"text"::"public"."group_type_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."group_type"`);
    await queryRunner.query(
      `ALTER TYPE "public"."group_type_old" RENAME TO "group_type"`,
    );
  }
}
