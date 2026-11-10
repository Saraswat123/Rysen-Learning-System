export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'
import { Pool } from 'pg'
import { MIGRATIONS } from '@/lib/migrations'


async function checkPending() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 8000 })
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

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 8000 })
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
    console.error('[admin/migrate]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  } finally {
    await pool.end()
  }
}
