export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { computeRatingsForPeriod, ensureRecognitionTables } from '@/lib/educator-ratings'

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await ensureRecognitionTables()

  // Every recognition category this educator belongs to (via its linked EducatorGroup)
  const myGroups = await db.educatorGroupMember.findMany({
    where: { userId: user.id },
    select: { groupId: true },
  })
  const groupIds = myGroups.map((g) => g.groupId)

  const myCategories = await db.recognitionCategory.findMany({
    where: { groupId: { in: groupIds } },
    select: { id: true, name: true },
  })

  if (myCategories.length === 0) {
    return NextResponse.json({ isInRecognitionProgram: false, categories: [] })
  }

  const { searchParams } = new URL(req.url)
  const requestedCategoryId = searchParams.get('categoryId')
  const requestedPeriod = searchParams.get('period')

  const categoryId = requestedCategoryId ?? myCategories[0].id

  const finalizedPeriods = await db.educatorRating.findMany({
    where: { categoryId, finalized: true },
    select: { period: true },
    distinct: ['period'],
    orderBy: { period: 'desc' },
  })
  const periods = finalizedPeriods.map((p) => p.period)
  const period = requestedPeriod ?? periods[0] ?? null

  if (!period) {
    return NextResponse.json({
      isInRecognitionProgram: true,
      categories: myCategories,
      selectedCategoryId: categoryId,
      periods: [], period: null, leaderboard: null, myDetail: null,
    })
  }

  const rows = await computeRatingsForPeriod(categoryId, period)
  const isFinalized = rows.some((r) => r.finalized)
  const me = rows.find((r) => r.userId === user.id) ?? null
  const categoryName = myCategories.find((c) => c.id === categoryId)?.name ?? ''

  return NextResponse.json({
    isInRecognitionProgram: true,
    categories: myCategories,
    selectedCategoryId: categoryId,
    categoryName,
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
