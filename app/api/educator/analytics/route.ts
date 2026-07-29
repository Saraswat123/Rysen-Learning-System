export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

const SCORE_BANDS = [
  { label: '0–19', min: 0, max: 19 },
  { label: '20–39', min: 20, max: 39 },
  { label: '40–59', min: 40, max: 59 },
  { label: '60–79', min: 60, max: 79 },
  { label: '80–100', min: 80, max: 100 },
]

export async function GET() {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN
    const branchId = isAdmin ? undefined : (user.branchId ?? undefined)

    // All active students + their attempts
    const students = await db.student.findMany({
      where: { ...(branchId ? { branchId } : {}), isActive: true },
      select: { id: true, name: true, class: true },
    })
    const studentIds = students.map((s) => s.id)

    const attempts = await db.studentAttempt.findMany({
      where: { studentId: { in: studentIds } },
      include: {
        test: { select: { subject: true, title: true, passScore: true, branchId: true } },
      },
      orderBy: { completedAt: 'desc' },
    })

    // Per-subject aggregation
    const subjectMap: Record<string, {
      attempts: number; passed: number; totalScore: number
      scores: number[]; studentSet: Set<string>
    }> = {}

    for (const a of attempts) {
      const subj = a.test.subject || 'General'
      const pct = a.totalMarks > 0 ? Math.round((a.score / a.totalMarks) * 100) : 0
      if (!subjectMap[subj]) subjectMap[subj] = { attempts: 0, passed: 0, totalScore: 0, scores: [], studentSet: new Set() }
      subjectMap[subj].attempts++
      if (a.passed) subjectMap[subj].passed++
      subjectMap[subj].totalScore += pct
      subjectMap[subj].scores.push(pct)
      subjectMap[subj].studentSet.add(a.studentId)
    }

    const subjectStats = Object.entries(subjectMap).map(([subject, d]) => ({
      subject,
      attempts: d.attempts,
      passed: d.passed,
      passRate: d.attempts > 0 ? Math.round((d.passed / d.attempts) * 100) : 0,
      avgScore: d.attempts > 0 ? Math.round(d.totalScore / d.attempts) : 0,
      uniqueStudents: d.studentSet.size,
      // Score band distribution for heatmap
      bands: SCORE_BANDS.map((b) => ({
        label: b.label,
        count: d.scores.filter((s) => s >= b.min && s <= b.max).length,
      })),
    })).sort((a, b) => b.attempts - a.attempts)

    // Stage dropout funnel — all published programs, educators in this branch
    const programs = await db.program.findMany({
      where: { isPublished: true },
      include: {
        stages: { orderBy: { number: 'asc' }, select: { id: true, number: true, title: true } },
        enrollments: { select: { userId: true } },
      },
    })

    // Filter enrollments to educators in this branch
    const branchUserIds: string[] | null = branchId
      ? await db.user.findMany({ where: { branchId }, select: { id: true } }).then((u) => u.map((x) => x.id))
      : null

    const stageProgressAll = await db.stageProgress.findMany({
      where: branchUserIds ? { userId: { in: branchUserIds } } : {},
      select: { stageId: true, userId: true, passed: true },
    })

    const stageFunnel = programs.map((prog) => {
      const enrolled = branchUserIds
        ? prog.enrollments.filter((e) => branchUserIds.includes(e.userId)).length
        : prog.enrollments.length

      const stages = prog.stages.map((stage) => {
        const stageAttempts = stageProgressAll.filter((sp) => sp.stageId === stage.id)
        const attempted = stageAttempts.length
        const passed = stageAttempts.filter((sp) => sp.passed).length
        return {
          stageId: stage.id,
          number: stage.number,
          title: stage.title,
          attempted,
          passed,
          dropRate: enrolled > 0 ? Math.round(((enrolled - attempted) / enrolled) * 100) : 0,
        }
      })

      return { programId: prog.id, programName: prog.name, enrolled, stages }
    }).filter((p) => p.enrolled > 0)

    // Engagement over time — last 30 days bucketed by week
    const now = new Date()
    const weeks = [28, 21, 14, 7, 0].map((daysAgo) => {
      const start = new Date(now.getTime() - (daysAgo + 7) * 86400000)
      const end = new Date(now.getTime() - daysAgo * 86400000)
      const label = daysAgo === 0 ? 'This week' : `${daysAgo + 7}–${daysAgo}d ago`
      const count = attempts.filter((a) => {
        const d = new Date(a.completedAt)
        return d >= start && d < end
      }).length
      const uniqueStudents = new Set(
        attempts.filter((a) => {
          const d = new Date(a.completedAt)
          return d >= start && d < end
        }).map((a) => a.studentId)
      ).size
      return { label, count, uniqueStudents }
    })

    // At-risk students: no attempt in 14+ days OR pass rate < 40%
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000)
    const atRisk = students
      .map((s) => {
        const sAttempts = attempts.filter((a) => a.studentId === s.id)
        const lastAttempt = sAttempts[0]?.completedAt ?? null
        const passed = sAttempts.filter((a) => a.passed).length
        const passRate = sAttempts.length > 0 ? passed / sAttempts.length : 0
        const inactive = !lastAttempt || new Date(lastAttempt) < fourteenDaysAgo
        const failing = sAttempts.length > 0 && passRate < 0.4
        if (!inactive && !failing) return null
        return {
          id: s.id,
          name: s.name,
          class: s.class,
          lastAttempt,
          passRate: Math.round(passRate * 100),
          totalAttempts: sAttempts.length,
          reason: inactive && failing ? 'Inactive + Low pass rate' : inactive ? 'No activity 14+ days' : 'Pass rate < 40%',
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      subjectStats,
      stageFunnel,
      engagementTrend: weeks,
      atRisk,
      meta: {
        totalStudents: students.length,
        totalAttempts: attempts.length,
        totalSubjects: subjectStats.length,
        scoreBands: SCORE_BANDS.map((b) => b.label),
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
