export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET() {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const [branches, stages, educators, stageProgress, programs, enrollments, students, attempts] = await Promise.all([
    db.branch.findMany({ orderBy: { name: 'asc' } }),
    db.stage.findMany({ select: { id: true } }),
    db.user.findMany({
      where: { role: { in: [Role.EDUCATOR, Role.PRINCIPAL] }, isActive: true },
      select: { id: true, branchId: true },
    }),
    db.stageProgress.findMany({ select: { userId: true, stageId: true, passed: true, bestScore: true } }),
    db.program.findMany({ select: { id: true } }),
    db.programEnrollment.findMany({ select: { userId: true, programId: true } }),
    db.student.findMany({ where: { isActive: true }, select: { id: true, branchId: true } }),
    db.studentAttempt.findMany({
      select: { studentId: true, passed: true, score: true },
    }),
  ])

  const totalStages = stages.length
  const totalPrograms = programs.length

  const educatorReport = branches.map((branch) => {
    const branchEducators = educators.filter((e) => e.branchId === branch.id)
    const eduIds = new Set(branchEducators.map((e) => e.id))

    const branchProgress = stageProgress.filter((p) => eduIds.has(p.userId))
    const branchEnrollments = enrollments.filter((e) => eduIds.has(e.userId))

    const passedStagesByEdu = new Map<string, Set<string>>()
    for (const p of branchProgress) {
      if (p.passed) {
        if (!passedStagesByEdu.has(p.userId)) passedStagesByEdu.set(p.userId, new Set())
        passedStagesByEdu.get(p.userId)!.add(p.stageId)
      }
    }

    const fullyCertified = branchEducators.filter(
      (e) => (passedStagesByEdu.get(e.id)?.size ?? 0) >= totalStages
    ).length

    const totalAttempts = branchProgress.length
    const totalPassed = branchProgress.filter((p) => p.passed).length
    const scores = branchProgress.map((p) => p.bestScore ?? 0).filter((s) => s > 0)
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

    const programsEnrolledSet = new Set(branchEnrollments.map((e) => e.programId))

    return {
      branch: branch.name,
      location: branch.location,
      totalEducators: branchEducators.length,
      programsEnrolled: programsEnrolledSet.size,
      totalPrograms,
      stageAttempts: totalAttempts,
      stagesPassed: totalPassed,
      passPercent: totalAttempts > 0 ? Math.round((totalPassed / totalAttempts) * 100) : 0,
      avgScore,
      fullyCertified,
    }
  })

  const studentReport = branches.map((branch) => {
    const branchStudents = students.filter((s) => s.branchId === branch.id)
    const stuIds = new Set(branchStudents.map((s) => s.id))
    const branchAttempts = attempts.filter((a) => stuIds.has(a.studentId))

    const passed = branchAttempts.filter((a) => a.passed).length
    const scores = branchAttempts.map((a) => a.score ?? 0).filter((s) => s > 0)
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

    return {
      branch: branch.name,
      location: branch.location,
      totalStudents: branchStudents.length,
      totalAttempts: branchAttempts.length,
      passed,
      failed: branchAttempts.length - passed,
      passPercent: branchAttempts.length > 0 ? Math.round((passed / branchAttempts.length) * 100) : 0,
      avgScore,
    }
  })

  return NextResponse.json({ educatorReport, studentReport, totalStages, totalPrograms })
}
