export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET() {
  try {
    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.EDUCATOR)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const students = await db.student.findMany({
      include: {
        branch: true,
        attempts: { include: { test: true }, orderBy: { completedAt: 'desc' } },
      },
      orderBy: [{ class: 'asc' }, { name: 'asc' }],
    })

    const rows = [
      ['Name', 'Class', 'Section', 'Subject', 'Branch', 'Tests Taken', 'Best Score', 'Passed', 'Created At'],
      ...students.map((s) => {
        const bestAttempt = s.attempts.reduce<typeof s.attempts[0] | null>((best, a) =>
          !best || a.score > best.score ? a : best, null)
        return [
          s.name,
          s.class,
          s.section,
          s.subject,
          s.branch?.name ?? '',
          s.attempts.length,
          bestAttempt ? `${bestAttempt.score}/${bestAttempt.totalMarks}` : '',
          bestAttempt?.passed ? 'Yes' : s.attempts.length > 0 ? 'No' : '',
          new Date(s.createdAt).toLocaleDateString('en-IN'),
        ]
      }),
    ]

    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="students-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
