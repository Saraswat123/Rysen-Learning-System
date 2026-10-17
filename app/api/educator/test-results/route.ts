export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

function isStaff(role: Role) {
  return role === Role.SUPER_ADMIN || role === Role.ADMIN || role === Role.EDUCATOR
}

// Student results, scoped per role:
//  - Educator: only attempts by students THEY added (createdById)
//  - Admin/Super Admin: every attempt, campus-wide
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user || !isStaff(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const testId = searchParams.get('testId') || undefined
  const targetClass = searchParams.get('class') || undefined

  const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN

  const attempts = await db.studentAttempt.findMany({
    where: {
      ...(testId ? { testId } : {}),
      student: {
        isActive: true,
        ...(isAdmin ? {} : { createdById: user.id }),
        ...(targetClass ? { class: targetClass } : {}),
      },
    },
    include: {
      student: { select: { id: true, name: true, class: true, section: true } },
      test: { select: { id: true, title: true, subject: true } },
    },
    orderBy: { completedAt: 'desc' },
  })

  const rows = attempts.map((a) => ({
    id: a.id,
    studentName: a.student.name,
    class: a.student.class,
    section: a.student.section,
    testId: a.testId,
    testTitle: a.test.title,
    subject: a.test.subject,
    score: a.score,
    totalMarks: a.totalMarks,
    percentage: a.totalMarks > 0 ? Math.round((a.score / a.totalMarks) * 100) : 0,
    passed: a.passed,
    completedAt: a.completedAt,
  }))

  const avgScore = rows.length > 0
    ? Math.round(rows.reduce((sum, r) => sum + r.percentage, 0) / rows.length)
    : 0

  return NextResponse.json({
    rows,
    scope: isAdmin ? 'ALL' : 'OWN_STUDENTS',
    summary: {
      total: rows.length,
      passed: rows.filter((r) => r.passed).length,
      failed: rows.filter((r) => !r.passed).length,
      passRate: rows.length > 0 ? Math.round((rows.filter((r) => r.passed).length / rows.length) * 100) : 0,
      avgScore,
    },
  })
}
