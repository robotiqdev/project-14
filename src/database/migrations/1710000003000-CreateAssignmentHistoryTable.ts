import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAssignmentHistoryTable1710000003000
  implements MigrationInterface
{
  name = 'CreateAssignmentHistoryTable1710000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "assignment_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "taskId" uuid NOT NULL,
        "assigneeId" uuid NOT NULL,
        "assignedById" uuid NOT NULL,
        "assignedAt" TIMESTAMPTZ NOT NULL,
        "unassignedAt" TIMESTAMPTZ,
        "unassignedById" uuid,
        "reason" character varying(500),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assignment_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_assignment_history_taskId" FOREIGN KEY ("taskId")
          REFERENCES "tasks"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_assignment_history_assigneeId" FOREIGN KEY ("assigneeId")
          REFERENCES "users"("id"),
        CONSTRAINT "FK_assignment_history_assignedById" FOREIGN KEY ("assignedById")
          REFERENCES "users"("id"),
        CONSTRAINT "FK_assignment_history_unassignedById" FOREIGN KEY ("unassignedById")
          REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_assignment_history_taskId_assignedAt" ON "assignment_history" ("taskId", "assignedAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_assignment_history_assigneeId" ON "assignment_history" ("assigneeId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_assignment_history_unassignedAt" ON "assignment_history" ("unassignedAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_assignment_history_unassignedAt"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_assignment_history_assigneeId"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_assignment_history_taskId_assignedAt"`,
    );
    await queryRunner.query(`DROP TABLE "assignment_history"`);
  }
}
