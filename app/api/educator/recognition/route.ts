export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { computeRatingsForPeriod, getStemEducatorGroup } from '@/lib/educator-ratings'

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const group = await getStemEducatorGroup()
  const isStemEducator = !!group?.members.some((m) => m.userId === user.id)
  if (!isStemEducator) {
    return NextResponse.json({ isStemEducator: false })
  }

  const { searchParams } = new URL(req.url)
  const requestedPeriod = searchParams.get('period')

  // All finalized periods, newest first
  const finalizedPeriods = await db.educatorRating.findMany({
    where: { finalized: true },
    select: { period: true },
    distinct: ['period'],
    orderBy: { period: 'desc' },
  })
  const periods = finalizedPeriods.map((p) => p.period)

  const period = requestedPeriod ?? periods[0] ?? null
  if (!period) {
    return NextResponse.json({ isStemEducator: true, periods: [], leaderboard: null, myDetail: null })
  }

  const rows = await computeRatingsForPeriod(period)
  const isFinalized = rows.some((r) => r.finalized)
  const me = rows.find((r) => r.userId === user.id) ?? null

  return NextResponse.json({
    isStemEducator: true,
    periods,
    period,
    isFinalized,
    leaderboard: rows.map((r) => ({
      rank: r.rank, userId: r.userId, name: r.name, branch: r.branch?.name ?? null,
      avatarUrl: r.avatarUrl, average: r.average, isMe: r.userId === user.id,
    })),
    myDetail: me,
  })
}
