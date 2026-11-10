import { db } from './db'

// Columns/tables that auth and rate limiting need before an admin can log in
// and run /api/admin/migrate. Checked once per instance via information_schema
// (no lock); DDL only runs for what is actually missing, with a short
// lock_timeout so a busy table never stalls logins behind an ACCESS EXCLUSIVE.
const TABLES: { table: string; ddl: string }[] = [
  {
    table: 'RateLimit',
    ddl: `CREATE TABLE IF NOT EXISTS "RateLimit" ("key" TEXT PRIMARY KEY, "count" INTEGER NOT NULL, "resetAt" TIMESTAMP(3) NOT NULL)`,
  },
]

const COLUMNS: { table: string; column: string; ddl: string }[] = [
  { table: 'User', column: 'password', ddl: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT` },
  { table: 'User', column: 'passwordSetAt', ddl: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordSetAt" TIMESTAMP(3)` },
  { table: 'User', column: 'avatarUrl', ddl: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT` },
  { table: 'Student', column: 'pinHash', ddl: `ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "pinHash" TEXT` },
]

let ensured: Promise<void> | null = null

export function ensureRuntimeSchema(): Promise<void> {
  ensured ??= run().catch((err) => {
    console.error('[schema-heal]', err)
    ensured = null
  })
  return ensured
}

async function run() {
  const rows = await db.$queryRaw<{ table_name: string; column_name: string }[]>`
    SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema()`
  const tables = new Set(rows.map((r) => r.table_name))
  const columns = new Set(rows.map((r) => `${r.table_name}.${r.column_name}`))

  const pending = [
    ...TABLES.filter((t) => !tables.has(t.table)).map((t) => t.ddl),
    ...COLUMNS.filter((c) => !columns.has(`${c.table}.${c.column}`)).map((c) => c.ddl),
  ]
  for (const ddl of pending) {
    await db.$transaction([db.$executeRawUnsafe(`SET LOCAL lock_timeout = '3s'`), db.$executeRawUnsafe(ddl)])
  }
}
