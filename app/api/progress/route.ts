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

  const result = stages.map((stage, i) => {
    const progress = stage.progress[0] ?? null
    const prevPassed = i === 0 || stages[i - 1].progress[0]?.passed === true
    return {
      ...stage,
      progress,
      isUnlocked: stage.isPublished && prevPassed,
    }
  })

  return NextResponse.json(result)
}
