export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'
import { Pool } from 'pg'

export async function POST() {
  const user = await getSession()
  if (!user || user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const results: string[] = []

  try {
    const migrations = [
      {
        check: `SELECT column_name FROM information_schema.columns WHERE table_name='Question' AND column_name='docGroupId'`,
        sql: `ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "docGroupId" TEXT`,
        label: 'Question.docGroupId',
      },
      {
        check: `SELECT column_name FROM information_schema.columns WHERE table_name='Stage' AND column_name='weeks'`,
        sql: `ALTER TABLE "Stage" ADD COLUMN IF NOT EXISTS "weeks" JSONB NOT NULL DEFAULT '[]'`,
        label: 'Stage.weeks',
      },
    ]

    for (const m of migrations) {
      const { rows } = await pool.query(m.check)
      if (rows.length === 0) {
        await pool.query(m.sql)
        results.push(`✓ Added ${m.label}`)
      } else {
        results.push(`— ${m.label} already exists`)
      }
    }

    return NextResponse.json({ ok: true, results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  } finally {
    await pool.end()
  }
}
