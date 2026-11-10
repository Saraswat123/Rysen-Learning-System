import { beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { freshDatabase, id, insertBranch, insertStudent, insertTest, insertUser } from './pg'
import { RATE_LIMIT_SQL } from '@/lib/rate-limit'

let pg: PGlite
beforeEach(async () => {
  pg = await freshDatabase()
})

const hit = async (key: string, windowSeconds = 900) =>
  (await pg.query<{ count: number }>(RATE_LIMIT_SQL, [key, windowSeconds])).rows[0].count

describe('rate limit SQL', () => {
  it('counts hits per key inside the window', async () => {
    expect(await hit('login:ip:1.2.3.4')).toBe(1)
    expect(await hit('login:ip:1.2.3.4')).toBe(2)
    expect(await hit('login:ip:1.2.3.4')).toBe(3)
    expect(await hit('login:ip:5.6.7.8')).toBe(1)
  })

  it('starts a new window once resetAt has passed', async () => {
    await hit('k')
    await hit('k')
    await pg.query(`UPDATE "RateLimit" SET "resetAt" = NOW() - INTERVAL '1 second' WHERE "key" = 'k'`)
    expect(await hit('k')).toBe(1)
  })
})

describe('advisory lock used by attempt caps', () => {
  it('executes inside a transaction', async () => {
    await pg.transaction(async (tx) => {
      await tx.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, ['student:test'])
    })
  })
})

describe('cascades and constraints', () => {
  it('deleting a student removes their attempts and sessions', async () => {
    const branch = await insertBranch(pg)
    const student = await insertStudent(pg, branch)
    const test = await insertTest(pg, branch)
    await pg.query(`INSERT INTO "StudentAttempt" ("id", "studentId", "testId") VALUES ($1, $2, $3)`, [id('att'), student, test])
    await pg.query(`INSERT INTO "StudentSession" ("id", "studentId", "token", "expiresAt") VALUES ($1, $2, $3, NOW() + INTERVAL '1 day')`, [id('ss'), student, id('tok')])

    await pg.query(`DELETE FROM "Student" WHERE "id" = $1`, [student])

    const attempts = await pg.query(`SELECT 1 FROM "StudentAttempt" WHERE "studentId" = $1`, [student])
    const sessions = await pg.query(`SELECT 1 FROM "StudentSession" WHERE "studentId" = $1`, [student])
    expect(attempts.rows).toHaveLength(0)
    expect(sessions.rows).toHaveLength(0)
  })

  it('deleting an educator removes their sessions and stage progress', async () => {
    const educator = await insertUser(pg, 'EDUCATOR')
    const stage = id('stage')
    await pg.query(`INSERT INTO "Stage" ("id", "number", "title", "updatedAt") VALUES ($1, 1, 'Welcome', NOW())`, [stage])
    await pg.query(`INSERT INTO "StageProgress" ("id", "userId", "stageId", "updatedAt") VALUES ($1, $2, $3, NOW())`, [id('sp'), educator, stage])
    await pg.query(`INSERT INTO "Session" ("id", "userId", "token", "expiresAt") VALUES ($1, $2, $3, NOW() + INTERVAL '1 day')`, [id('s'), educator, id('tok')])

    await pg.query(`DELETE FROM "User" WHERE "id" = $1`, [educator])

    expect((await pg.query(`SELECT 1 FROM "Session" WHERE "userId" = $1`, [educator])).rows).toHaveLength(0)
    expect((await pg.query(`SELECT 1 FROM "StageProgress" WHERE "userId" = $1`, [educator])).rows).toHaveLength(0)
  })

  it('a student PIN hash column exists and defaults to null', async () => {
    const student = await insertStudent(pg, null)
    const { rows } = await pg.query<{ pinHash: string | null }>(`SELECT "pinHash" FROM "Student" WHERE "id" = $1`, [student])
    expect(rows[0].pinHash).toBeNull()
  })

  it('emails are unique across users', async () => {
    const userId = await insertUser(pg, 'EDUCATOR')
    await expect(
      pg.query(`INSERT INTO "User" ("id", "name", "email", "updatedAt") VALUES ($1, 'Dup', $2, NOW())`, [id('u'), `${userId}@example.com`]),
    ).rejects.toThrow()
  })
})
