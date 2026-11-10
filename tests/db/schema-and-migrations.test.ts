import { describe, expect, it } from 'vitest'
import { freshDatabase, insertUser, id } from './pg'
import { MIGRATIONS } from '@/lib/migrations'
import type { PGlite } from '@electric-sql/pglite'

async function pending(pg: PGlite) {
  const out: string[] = []
  for (const m of MIGRATIONS) {
    const { rows } = await pg.query(m.check)
    if (m.invert ? rows.length > 0 : rows.length === 0) out.push(m.label)
  }
  return out
}

async function migrate(pg: PGlite) {
  for (const m of MIGRATIONS) {
    const { rows } = await pg.query(m.check)
    if (m.invert ? rows.length > 0 : rows.length === 0) await pg.exec(m.sql)
  }
}

describe('Prisma schema + migrate route', () => {
  it('applies the full Prisma schema to a clean Postgres', async () => {
    const pg = await freshDatabase()
    const { rows } = await pg.query<{ n: number }>(`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`)
    expect(rows[0].n).toBeGreaterThanOrEqual(30)
  })

  // Data backfills whose check looks for rows; on an empty database they have nothing to act on
  const DATA_BACKFILLS = [
    'Assign existing stages to Orientation Program',
    'Auto-enroll existing educators in Orientation Program',
    'Seed STEM recognition category (5 KRAs, hackathon removed)',
  ]

  it('every schema migration runs once and is then done; re-running is harmless', async () => {
    const pg = await freshDatabase()
    await migrate(pg)
    expect((await pending(pg)).filter((l) => !DATA_BACKFILLS.includes(l))).toEqual([])
    await migrate(pg)
    expect((await pending(pg)).filter((l) => !DATA_BACKFILLS.includes(l))).toEqual([])
  })

  it('migrating never drops the current EducatorRating table (regression: ratings wiped every admin session)', async () => {
    const pg = await freshDatabase()
    expect(await pending(pg)).not.toContain('Drop legacy fixed-KRA EducatorRating table')

    const educator = await insertUser(pg, 'EDUCATOR')
    const groupId = id('group')
    const categoryId = id('cat')
    await pg.query(`INSERT INTO "EducatorGroup" ("id", "name") VALUES ($1, 'G')`, [groupId])
    await pg.query(`INSERT INTO "RecognitionCategory" ("id", "name", "groupId") VALUES ($1, 'C', $2)`, [categoryId, groupId])
    await pg.query(
      `INSERT INTO "EducatorRating" ("id", "userId", "categoryId", "period", "updatedAt") VALUES ($1, $2, $3, '2026-11', NOW())`,
      [id('rating'), educator, categoryId],
    )
    await migrate(pg)
    await migrate(pg)
    const { rows } = await pg.query(`SELECT 1 FROM "EducatorRating"`)
    expect(rows).toHaveLength(1)
  })

  it('still drops the table when it has the legacy kra1 shape', async () => {
    const pg = await freshDatabase()
    await pg.exec(`ALTER TABLE "EducatorRating" ADD COLUMN "kra1" INTEGER`)
    expect(await pending(pg)).toContain('Drop legacy fixed-KRA EducatorRating table')
    const m = MIGRATIONS.find((x) => x.label === 'Drop legacy fixed-KRA EducatorRating table')!
    await pg.exec(m.sql)
    const { rows } = await pg.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'EducatorRating'`)
    expect(rows).toHaveLength(0)
  })

  it('creates every index the routes rely on', async () => {
    const pg = await freshDatabase()
    await migrate(pg)
    const { rows } = await pg.query<{ indexname: string }>(`SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`)
    const names = new Set(rows.map((r) => r.indexname))
    for (const expected of [
      'StudentAttempt_studentId_completedAt_idx', 'StudentAttempt_testId_idx', 'Student_branchId_isActive_idx',
      'User_branchId_role_idx', 'Notification_userId_createdAt_idx', 'GroupMessage_groupId_createdAt_idx',
      'StageProgress_stageId_idx', 'TaskAssignment_userId_idx', 'Task_createdAt_idx', 'Session_userId_idx',
      'StudentSession_studentId_idx', 'EducatorGroupMember_userId_idx', 'TextResponse_questionId_idx', 'StudentTest_branchId_idx',
    ]) {
      expect(names, expected).toContain(expected)
    }
  })

  it('upgrades a legacy EducatorRating table so deleting the rater keeps the rating', async () => {
    const pg = await freshDatabase()
    // Recreate the pre-fix production shape: NOT NULL rater with a RESTRICT foreign key
    await pg.exec(`
      ALTER TABLE "EducatorRating" DROP CONSTRAINT IF EXISTS "EducatorRating_ratedById_fkey";
      UPDATE "EducatorRating" SET "ratedById" = '' WHERE "ratedById" IS NULL;
      ALTER TABLE "EducatorRating" ALTER COLUMN "ratedById" SET NOT NULL;
      ALTER TABLE "EducatorRating" ADD CONSTRAINT "EducatorRating_ratedById_fkey" FOREIGN KEY ("ratedById") REFERENCES "User"("id");
    `)
    expect(await pending(pg)).toContain('EducatorRating.ratedById nullable, ON DELETE SET NULL')

    const educator = await insertUser(pg, 'EDUCATOR')
    const rater = await insertUser(pg, 'ADMIN')
    const groupId = id('group')
    const categoryId = id('cat')
    await pg.query(`INSERT INTO "EducatorGroup" ("id", "name") VALUES ($1, 'G')`, [groupId])
    await pg.query(`INSERT INTO "RecognitionCategory" ("id", "name", "groupId") VALUES ($1, 'C', $2)`, [categoryId, groupId])
    const ratingId = id('rating')
    await pg.query(
      `INSERT INTO "EducatorRating" ("id", "userId", "categoryId", "period", "ratedById", "updatedAt") VALUES ($1, $2, $3, '2026-11', $4, NOW())`,
      [ratingId, educator, categoryId, rater],
    )

    await expect(pg.query(`DELETE FROM "User" WHERE "id" = $1`, [rater])).rejects.toThrow()

    await migrate(pg)
    await pg.query(`DELETE FROM "User" WHERE "id" = $1`, [rater])
    const { rows } = await pg.query<{ ratedById: string | null }>(`SELECT "ratedById" FROM "EducatorRating" WHERE "id" = $1`, [ratingId])
    expect(rows).toEqual([{ ratedById: null }])
  })
})
