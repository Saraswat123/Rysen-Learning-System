export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { educatorStudentWhere } from '@/lib/student-scope'
import { Prisma, Role } from '@/app/generated/prisma/client'

export async function GET() {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN
    const branchId = isAdmin ? undefined : (user.branchId ?? undefined)
    // Non-admins without a campus see nothing (an unset branch used to mean "all campuses")
    const studentScope: Prisma.StudentWhereInput = isAdmin
      ? {}
      : !user.branchId
        ? { id: { in: [] } }
        : user.role === Role.EDUCATOR
          ? educatorStudentWhere(user.id, user.branchId)
          : { branchId: user.branchId }

    // All students for this branch
    const students = await db.student.findMany({
      where: { ...studentScope, isActive: true },
      include: {
        branch: { select: { id: true, name: true } },
        attempts: {
          include: { test: { select: { id: true, title: true, subject: true, passScore: true } } },
          orderBy: { completedAt: 'desc' },
        },
      },
      orderBy: [{ class: 'asc' }, { name: 'asc' }],
    })

    // Total published tests for this branch
    const tests = await db.studentTest.findMany({
      where: { isPublished: true, ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : {}) },
      select: { id: true, title: true, subject: true, branchId: true },
    })
    const totalTests = tests.length

    const data = students.map((s) => {
      const attempts = s.attempts
      // Engagement is measured against the tests this student could actually take
      const availableIds = new Set(tests.filter((t) => t.branchId === null || t.branchId === s.branch?.id).map((t) => t.id))
      const uniqueTestsTried = new Set(attempts.map((a) => a.testId).filter((id) => availableIds.has(id))).size
      const passed = attempts.filter((a) => a.passed).length
      const scores = attempts.map((a) => a.totalMarks > 0 ? Math.round((a.score / a.totalMarks) * 100) : 0)
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
      const bestScore = scores.length > 0 ? Math.max(...scores) : null
      const lastAttempt = attempts[0]?.completedAt ?? null

      // Subject breakdown
      const bySubject: Record<string, { attempts: number; passed: number; avgScore: number }> = {}
      for (const a of attempts) {
        const subj = a.test.subject || 'General'
        if (!bySubject[subj]) bySubject[subj] = { attempts: 0, passed: 0, avgScore: 0 }
        bySubject[subj].attempts++
        if (a.passed) bySubject[subj].passed++
        bySubject[subj].avgScore = Math.round(
          (bySubject[subj].avgScore * (bySubject[subj].attempts - 1) + (a.totalMarks > 0 ? (a.score / a.totalMarks) * 100 : 0)) / bySubject[subj].attempts
        )
      }

      // Engagement: % of available tests attempted at least once
      const engagement = availableIds.size > 0 ? Math.round((uniqueTestsTried / availableIds.size) * 100) : 0

      return {
        id: s.id,
        name: s.name,
        class: s.class,
        section: s.section,
        subject: s.subject,
        branch: s.branch,
        totalAttempts: attempts.length,
        uniqueTestsTried,
        totalTests: availableIds.size,
        passed,
        avgScore,
        bestScore,
        lastAttempt,
        engagement,
        bySubject,
        // Risk flag: low engagement or failing most tests
        atRisk: (availableIds.size > 0 && engagement < 30) || (attempts.length > 0 && passed / attempts.length < 0.4),
      }
    })

    // Summary stats
    const summary = {
      totalStudents: data.length,
      avgScore: data.filter((d) => d.avgScore !== null).length > 0
        ? Math.round(data.filter((d) => d.avgScore !== null).reduce((a, b) => a + (b.avgScore ?? 0), 0) / data.filter((d) => d.avgScore !== null).length)
        : null,
      avgEngagement: data.length > 0 ? Math.round(data.reduce((a, b) => a + b.engagement, 0) / data.length) : 0,
      atRiskCount: data.filter((d) => d.atRisk).length,
      totalTests,
    }

    return NextResponse.json({ students: data, summary })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
