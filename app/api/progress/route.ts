export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [stages, programs] = await Promise.all([
    db.stage.findMany({
      orderBy: { number: 'asc' },
      include: {
        progress: { where: { userId: user.id } },
        _count: { select: { questions: true } },
      },
    }),
    db.program.findMany({ orderBy: { order: 'asc' } }),
  ])

  // Group stages by programId, compute unlock per group
  const grouped = new Map<string | null, typeof stages>()
  for (const s of stages) {
    const key = s.programId ?? null
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(s)
  }

  const result = stages.map((stage) => {
    const group = grouped.get(stage.programId ?? null) ?? []
    const idx = group.findIndex((s) => s.id === stage.id)
    const progress = stage.progress[0] ?? null
    const prevPassed = idx === 0 || group[idx - 1].progress[0]?.passed === true
    return {
      ...stage,
      progress,
      isUnlocked: stage.isPublished && prevPassed,
    }
  })

  // Also return programs for dashboard use
  const programsWithStages = programs.map((p) => ({
    ...p,
    stages: result.filter((s) => s.programId === p.id),
  }))

  // Stages not assigned to any program
  const unassigned = result.filter((s) => !s.programId)

  return NextResponse.json({ programs: programsWithStages, unassigned, stages: result })
}
