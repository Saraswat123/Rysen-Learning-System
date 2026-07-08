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

  const [educators, stages, progress] = await Promise.all([
    db.user.findMany({
      where: { role: { in: [Role.EDUCATOR, Role.PRINCIPAL] }, isActive: true },
      select: { id: true, name: true, email: true, branch: { select: { name: true, location: true } } },
      orderBy: { name: 'asc' },
    }),
    db.stage.findMany({ orderBy: { number: 'asc' }, select: { id: true, number: true, title: true } }),
    db.stageProgress.findMany({
      include: { stage: { select: { id: true, number: true, title: true } } },
    }),
  ])

  // Row per educator per stage
  const rows = educators.flatMap((edu) =>
    stages.map((stage) => {
      const attempts = progress.filter((p) => p.userId === edu.id && p.stageId === stage.id)
      const best = attempts.reduce((max, p) => Math.max(max, p.bestScore ?? 0), 0)
      const passed = attempts.some((p) => p.passed)
      const totalAttempts = attempts.length
      return {
        Name: edu.name,
        Email: edu.email,
        Branch: edu.branch?.name ?? '',
        Location: edu.branch?.location ?? '',
        StageNo: stage.number,
        Stage: stage.title,
        Attempts: totalAttempts,
        BestScore: totalAttempts > 0 ? best : '',
        Passed: totalAttempts > 0 ? (passed ? 'Yes' : 'No') : 'Not attempted',
      }
    })
  )

  // Summary rows per educator
  const summary = educators.map((edu) => {
    const eduProgress = progress.filter((p) => p.userId === edu.id)
    const attempted = new Set(eduProgress.map((p) => p.stageId)).size
    const passed = new Set(eduProgress.filter((p) => p.passed).map((p) => p.stageId)).size
    const scores = eduProgress.map((p) => p.bestScore ?? 0).filter((s) => s > 0)
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    return {
      Name: edu.name,
      Email: edu.email,
      Branch: edu.branch?.name ?? '',
      Location: edu.branch?.location ?? '',
      StagesAttempted: attempted,
      StagesPassed: passed,
      TotalStages: stages.length,
      AvgScore: avg,
      CompletionPct: stages.length > 0 ? Math.round((passed / stages.length) * 100) : 0,
      FullyCertified: passed >= stages.length ? 'Yes' : 'No',
    }
  })

  return NextResponse.json({ rows, summary, stages: stages.map((s) => ({ id: s.id, number: s.number, title: s.title })) })
}
