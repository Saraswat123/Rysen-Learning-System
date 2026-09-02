export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Role } from '@/app/generated/prisma/client'

export async function GET() {
  const [branches, stages, users, progress, enrollments] = await Promise.all([
    db.branch.findMany({ orderBy: { name: 'asc' } }),
    db.stage.findMany({
      where: { isPublished: true, applicableTo: { in: ['BOTH', 'EDUCATOR'] } },
      select: { id: true, programId: true },
    }),
    db.user.findMany({ where: { role: Role.EDUCATOR, isActive: true }, select: { id: true, name: true, branchId: true } }),
    db.stageProgress.findMany({ where: { passed: true }, select: { userId: true, stageId: true } }),
    db.programEnrollment.findMany({ select: { userId: true, programId: true } }),
  ])

  // Legacy stages (programId null) always count for everyone — they predate the
  // multi-program model. Program-linked stages only count for educators actually
  // enrolled in that program, otherwise every educator's denominator included every
  // other program's stages too and completion % was wrong for anyone not enrolled
  // in all of them.
  const legacyStageIds = stages.filter((s) => s.programId === null).map((s) => s.id)
  const enrollmentsByUser = new Map<string, Set<string>>()
  for (const e of enrollments) {
    if (!enrollmentsByUser.has(e.userId)) enrollmentsByUser.set(e.userId, new Set())
    enrollmentsByUser.get(e.userId)!.add(e.programId)
  }
  const progressByUser = new Map<string, Set<string>>()
  for (const p of progress) {
    if (!progressByUser.has(p.userId)) progressByUser.set(p.userId, new Set())
    progressByUser.get(p.userId)!.add(p.stageId)
  }

  function statsFor(userId: string) {
    const myProgramIds = enrollmentsByUser.get(userId) ?? new Set<string>()
    const relevantStageIds = stages
      .filter((s) => s.programId === null || myProgramIds.has(s.programId))
      .map((s) => s.id)
    const passedStageIds = progressByUser.get(userId) ?? new Set<string>()
    const stagesPassed = relevantStageIds.filter((id) => passedStageIds.has(id)).length
    const total = relevantStageIds.length
    const completion = total > 0 ? Math.round((stagesPassed / total) * 100) : 0
    return { stagesPassed, total, completion }
  }

  const leaderboard = branches.map((branch) => {
    const branchEducators = users.filter((u) => u.branchId === branch.id)
    const total = branchEducators.length

    const educatorStats = branchEducators.map((edu) => {
      const s = statsFor(edu.id)
      return { id: edu.id, name: edu.name, stagesPassed: s.stagesPassed, completion: s.completion, totalForThem: s.total }
    })

    const fullyCertified = educatorStats.filter((e) => e.totalForThem > 0 && e.stagesPassed >= e.totalForThem).length
    const avgCompletion = total > 0 ? Math.round(educatorStats.reduce((s, e) => s + e.completion, 0) / total) : 0

    return {
      id: branch.id,
      name: branch.name,
      location: branch.location,
      total,
      fullyCertified,
      avgCompletion,
      topEducators: educatorStats.sort((a, b) => b.stagesPassed - a.stagesPassed).slice(0, 3)
        .map(({ id, name, stagesPassed, completion, totalForThem }) => ({ id, name, stagesPassed, completion, total: totalForThem })),
    }
  })
    .filter((b) => b.total > 0)
    .sort((a, b) => b.avgCompletion - a.avgCompletion || b.fullyCertified - a.fullyCertified)

  const legacyTotal = legacyStageIds.length
  return NextResponse.json({ leaderboard, totalStages: legacyTotal })
}
