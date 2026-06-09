import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stages = await db.stage.findMany({
    orderBy: { number: 'asc' },
    include: { progress: { where: { userId: user.id } } },
  })

  const allPassed = stages.every((s) => s.progress[0]?.passed === true)
  if (!allPassed) return NextResponse.json({ error: 'Not all stages completed' }, { status: 403 })

  const completedAt = stages
    .map((s) => s.progress[0]?.completedAt)
    .filter(Boolean)
    .sort((a, b) => (b! > a! ? 1 : -1))[0]

  return NextResponse.json({
    name: user.name,
    branch: user.branch?.name,
    location: user.branch?.location,
    completedAt,
    stages: stages.map((s) => ({
      number: s.number,
      title: s.title,
      badgeTitle: s.badgeTitle,
      badgeColor: s.badgeColor,
    })),
  })
}
