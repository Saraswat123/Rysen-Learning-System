export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get('branchId') || undefined
  const testId = searchParams.get('testId') || undefined
  const targetClass = searchParams.get('class') || undefined
  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined

  const [attempts, branches, tests] = await Promise.all([
    db.studentAttempt.findMany({
      where: {
        ...(testId ? { testId } : {}),
        ...(from || to ? {
          completedAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to + 'T23:59:59Z') } : {}),
          },
        } : {}),
        student: {
          isActive: true,
          ...(branchId ? { branchId } : {}),
          ...(targetClass ? { class: targetClass } : {}),
        },
      },
      include: {
        student: { include: { branch: { select: { id: true, name: true, location: true } } } },
        test: { select: { id: true, title: true, subject: true, targetClass: true, passScore: true } },
      },
      orderBy: { completedAt: 'desc' },
    }),
    db.branch.findMany({ orderBy: { location: 'asc' } }),
    db.studentTest.findMany({ orderBy: { order: 'asc' }, select: { id: true, title: true, subject: true } }),
  ])

  const rows = attempts.map((a) => ({
    id: a.id,
    studentName: a.student.name,
    class: a.student.class,
    section: a.student.section,
    branchName: a.student.branch?.name ?? '—',
    location: a.student.branch?.location ?? '—',
    branchId: a.student.branchId,
    testId: a.testId,
    testTitle: a.test.title,
    subject: a.test.subject,
    score: a.score,
    totalMarks: a.totalMarks,
    percentage: a.totalMarks > 0 ? Math.round((a.score / a.totalMarks) * 100) : 0,
    passed: a.passed,
    completedAt: a.completedAt,
  }))

  // Location-wise summary
  const locationMap = new Map<string, { location: string; total: number; passed: number }>()
  for (const r of rows) {
    const prev = locationMap.get(r.location) ?? { location: r.location, total: 0, passed: 0 }
    locationMap.set(r.location, { location: r.location, total: prev.total + 1, passed: prev.passed + (r.passed ? 1 : 0) })
  }

  return NextResponse.json({
    rows,
    branches,
    tests,
    summary: {
      total: rows.length,
      passed: rows.filter((r) => r.passed).length,
      failed: rows.filter((r) => !r.passed).length,
      passRate: rows.length > 0 ? Math.round((rows.filter((r) => r.passed).length / rows.length) * 100) : 0,
      byLocation: Array.from(locationMap.values()),
    },
  })
}
