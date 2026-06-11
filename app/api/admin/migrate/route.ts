export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'
import { Pool } from 'pg'

const MIGRATIONS = [
  {
    label: 'Question.docGroupId',
    check: `SELECT 1 FROM information_schema.columns WHERE table_name='Question' AND column_name='docGroupId'`,
    sql: `ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "docGroupId" TEXT`,
  },
  {
    label: 'Stage.weeks',
    check: `SELECT 1 FROM information_schema.columns WHERE table_name='Stage' AND column_name='weeks'`,
    sql: `ALTER TABLE "Stage" ADD COLUMN IF NOT EXISTS "weeks" JSONB NOT NULL DEFAULT '[]'`,
  },
  {
    label: 'Program table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='Program'`,
    sql: `CREATE TABLE IF NOT EXISTS "Program" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "isPublished" BOOLEAN NOT NULL DEFAULT false,
      "applicableTo" TEXT NOT NULL DEFAULT 'BOTH',
      "order" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    label: 'Stage.programId',
    check: `SELECT 1 FROM information_schema.columns WHERE table_name='Stage' AND column_name='programId'`,
    sql: `ALTER TABLE "Stage" ADD COLUMN IF NOT EXISTS "programId" TEXT REFERENCES "Program"("id") ON DELETE SET NULL`,
  },
  {
    label: 'Stage.number unique constraint drop',
    check: `SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='Stage_number_key' AND table_name='Stage'`,
    sql: `ALTER TABLE "Stage" DROP CONSTRAINT IF EXISTS "Stage_number_key"`,
    // This one: if constraint EXISTS we run the drop. Invert check logic below.
    invert: true,
  },
  {
    label: 'Default Orientation Program seed',
    check: `SELECT 1 FROM "Program" WHERE "id" = 'default-orientation'`,
    sql: `INSERT INTO "Program" ("id","name","description","isPublished","applicableTo","order","createdAt")
          VALUES ('default-orientation','Orientation Program','The core 5-stage teacher orientation',true,'BOTH',0,NOW())`,
  },
  {
    label: 'Assign existing stages to Orientation Program',
    check: `SELECT 1 FROM "Stage" WHERE "programId" IS NULL LIMIT 1`,
    sql: `UPDATE "Stage" SET "programId" = 'default-orientation' WHERE "programId" IS NULL`,
  },
]

async function checkPending() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    for (const m of MIGRATIONS) {
      const { rows } = await pool.query(m.check)
      const needed = m.invert ? rows.length > 0 : rows.length === 0
      if (needed) return true
    }
    return false
  } finally {
    await pool.end()
  }
}

export async function GET() {
  const user = await getSession()
  if (!user || user.role !== Role.SUPER_ADMIN) return NextResponse.json({ pending: false })
  const pending = await checkPending()
  return NextResponse.json({ pending })
}

export async function POST() {
  const user = await getSession()
  if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const results: string[] = []

  try {
    for (const m of MIGRATIONS) {
      const { rows } = await pool.query(m.check)
      const needed = m.invert ? rows.length > 0 : rows.length === 0
      if (needed) {
        await pool.query(m.sql)
        results.push(`✓ ${m.label}`)
      } else {
        results.push(`— ${m.label} (already done)`)
      }
    }
    return NextResponse.json({ ok: true, results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  } finally {
    await pool.end()
  }
}
