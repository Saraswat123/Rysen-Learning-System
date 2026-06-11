export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Role } from '@/app/generated/prisma/client'

export async function GET() {
  const [branches, stages, users, progress] = await Promise.all([
    db.branch.findMany({ orderBy: { name: 'asc' } }),
    db.stage.findMany({ where: { isPublished: true } }),
    db.user.findMany({ where: { role: Role.EDUCATOR, isActive: true }, select: { id: true, name: true, branchId: true } }),
    db.stageProgress.findMany({ where: { passed: true } }),
  ])

  const totalStages = stages.length

  const leaderboard = branches.map((branch) => {
    const branchEducators = users.filter((u) => u.branchId === branch.id)
    const total = branchEducators.length

    const educatorStats = branchEducators.map((edu) => {
      const passed = progress.filter((p) => p.userId === edu.id && p.passed).length
      return { id: edu.id, name: edu.name, stagesPassed: passed, completion: totalStages > 0 ? Math.round((passed / totalStages) * 100) : 0 }
    })

    const fullyCertified = educatorStats.filter((e) => e.stagesPassed >= totalStages).length
    const avgCompletion = total > 0 ? Math.round(educatorStats.reduce((s, e) => s + e.completion, 0) / total) : 0

    return {
      id: branch.id,
      name: branch.name,
      location: branch.location,
      total,
      fullyCertified,
      avgCompletion,
      topEducators: educatorStats.sort((a, b) => b.stagesPassed - a.stagesPassed).slice(0, 3),
    }
  })
    .filter((b) => b.total > 0)
    .sort((a, b) => b.avgCompletion - a.avgCompletion || b.fullyCertified - a.fullyCertified)

  return NextResponse.json({ leaderboard, totalStages })
}
