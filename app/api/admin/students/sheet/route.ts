export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'
import { sheetsEnabled, readSheet, syncAllStudents, ensureHeaders, HEADERS } from '@/lib/google-sheets'

function isAdmin(role: Role) {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN
}

// GET — read current sheet data, return rows grouped by branch
export async function GET() {
  try {
    const user = await getSession()
    if (!user || !isAdmin(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    if (!sheetsEnabled()) {
      return NextResponse.json({ enabled: false, rows: [], headers: HEADERS })
    }

    const rows = await readSheet()
    const dataRows = rows.slice(1) // skip header
    return NextResponse.json({ enabled: true, headers: HEADERS, rows: dataRows })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST — sync all students + test stats from DB to sheet
export async function POST() {
  try {
    const user = await getSession()
    if (!user || !isAdmin(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    if (!sheetsEnabled()) {
      return NextResponse.json({ error: 'Google Sheets not configured. Add GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY, GOOGLE_SHEETS_ID to Vercel env vars.' }, { status: 400 })
    }

    // All students with branch + attempts
    const students = await db.student.findMany({
      include: {
        branch: { select: { name: true } },
        attempts: {
          include: { test: { select: { title: true } } },
          orderBy: { completedAt: 'desc' },
        },
      },
      orderBy: [{ branch: { name: 'asc' } }, { class: 'asc' }, { name: 'asc' }],
    })

    const rows: string[][] = students.map((s) => {
      const attempts = s.attempts
      const passed = attempts.filter((a) => a.passed).length
      const scores = attempts.map((a) => a.totalMarks > 0 ? Math.round((a.score / a.totalMarks) * 100) : 0)
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
      const last = attempts[0]
      const lastScore = last && last.totalMarks > 0 ? Math.round((last.score / last.totalMarks) * 100) : 0

      return [
        s.branch?.name ?? '',
        s.name,
        s.class,
        s.section ?? '',
        s.subject ?? '',
        '',
        s.isActive ? 'Active' : 'Inactive',
        String(attempts.length),
        String(passed),
        String(avgScore),
        last?.test.title ?? '',
        last ? String(lastScore) : '',
        last ? (last.passed ? 'Passed' : 'Failed') : '',
        last ? new Date(last.completedAt).toLocaleDateString('en-IN') : '',
      ]
    })

    await syncAllStudents(rows)

    return NextResponse.json({ ok: true, synced: rows.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
