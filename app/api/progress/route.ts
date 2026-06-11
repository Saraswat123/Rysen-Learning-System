export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stages = await db.stage.findMany({
    orderBy: { number: 'asc' },
    include: {
      progress: { where: { userId: user.id } },
      _count: { select: { questions: true } },
    },
  })

  // Try to load programs — may not exist if migration hasn't run yet
  let programs: { id: string; name: string; description: string | null; isPublished: boolean; applicableTo: string; order: number }[] = []
  try {
    programs = await db.program.findMany({ orderBy: { order: 'asc' } })
  } catch {
    // Program table not yet created — will show all stages as unassigned
  }

  // Group stages by programId, compute per-program sequential unlock
  const grouped = new Map<string | null, typeof stages>()
  for (const s of stages) {
    const key = (s as { programId?: string | null }).programId ?? null
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(s)
  }

  const result = stages.map((stage) => {
    const key = (stage as { programId?: string | null }).programId ?? null
    const group = grouped.get(key) ?? []
    const idx = group.findIndex((s) => s.id === stage.id)
    const progress = stage.progress[0] ?? null
    const prevPassed = idx === 0 || group[idx - 1].progress[0]?.passed === true
    return {
      ...stage,
      progress,
      isUnlocked: stage.isPublished && prevPassed,
    }
  })

  const programsWithStages = programs.map((p) => ({
    ...p,
    stages: result.filter((s) => (s as { programId?: string | null }).programId === p.id),
  }))

  const unassigned = result.filter((s) => {
    const pid = (s as { programId?: string | null }).programId
    return !pid || programs.length === 0
  })

  return NextResponse.json({ programs: programsWithStages, unassigned, stages: result })
}
