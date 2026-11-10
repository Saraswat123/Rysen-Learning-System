import { PGlite } from '@electric-sql/pglite'
import { inject } from 'vitest'

/** A fresh in-process Postgres with the app's full Prisma schema applied. */
export async function freshDatabase(): Promise<PGlite> {
  const pg = new PGlite()
  await pg.exec(inject('schemaSql'))
  return pg
}

let seq = 0
export const id = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}_${(seq++).toString(36)}`

export async function insertBranch(pg: PGlite, name = 'Campus A') {
  const branchId = id('branch')
  await pg.query(`INSERT INTO "Branch" ("id", "name", "location") VALUES ($1, $2, 'City')`, [branchId, name])
  return branchId
}

export async function insertUser(pg: PGlite, role = 'EDUCATOR', branchId: string | null = null) {
  const userId = id('user')
  await pg.query(
    `INSERT INTO "User" ("id", "name", "email", "role", "branchId", "updatedAt") VALUES ($1, $2, $3, $4::"Role", $5, NOW())`,
    [userId, `User ${userId}`, `${userId}@example.com`, role, branchId],
  )
  return userId
}

export async function insertStudent(pg: PGlite, branchId: string | null) {
  const studentId = id('student')
  await pg.query(`INSERT INTO "Student" ("id", "name", "class", "branchId") VALUES ($1, 'Asha Rao', '10', $2)`, [studentId, branchId])
  return studentId
}

export async function insertTest(pg: PGlite, branchId: string | null, isPublished = true) {
  const testId = id('test')
  await pg.query(`INSERT INTO "StudentTest" ("id", "title", "branchId", "isPublished") VALUES ($1, 'Algebra 1', $2, $3)`, [testId, branchId, isPublished])
  return testId
}
