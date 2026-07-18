export const dynamic = 'force-dynamic'

// One-shot public route to add missing columns that block login.
// Safe: all statements use IF NOT EXISTS / idempotent.
// Delete this file once columns are confirmed present.

import { NextResponse } from 'next/server'
import { Pool } from 'pg'

export async function POST() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 })
  const results: { col: string; status: string }[] = []
  const fixes = [
    { col: 'User.phone', sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT` },
    { col: 'Task.notes', sql: `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "notes" TEXT` },
    { col: 'SubTask.deadline', sql: `ALTER TABLE "SubTask" ADD COLUMN IF NOT EXISTS "deadline" TIMESTAMP(3)` },
    { col: 'TaskResource.description', sql: `ALTER TABLE "TaskResource" ADD COLUMN IF NOT EXISTS "description" TEXT` },
  ]
  for (const fix of fixes) {
    try {
      await pool.query(fix.sql)
      results.push({ col: fix.col, status: 'ok' })
    } catch (e) {
      results.push({ col: fix.col, status: String(e) })
    }
  }
  await pool.end()
  return NextResponse.json({ done: true, results })
}
