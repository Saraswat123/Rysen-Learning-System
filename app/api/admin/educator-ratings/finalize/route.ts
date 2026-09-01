export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'
import { computeRatingsForPeriod, getCategory, ensureRecognitionTables } from '@/lib/educator-ratings'

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  await ensureRecognitionTables()

  const { categoryId, period } = await req.json() as { categoryId: string; period: string }
  if (!categoryId || !period) return NextResponse.json({ error: 'categoryId and period required' }, { status: 400 })

  const category = await getCategory(categoryId)
  if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

  const rows = await computeRatingsForPeriod(categoryId, period)
  const now = new Date()
  const manualCriteria = category.criteria.filter((c) => !c.isAutoTest)

  for (const row of rows) {
    const scores: Record<string, number> = {}
    for (const c of manualCriteria) {
      const found = row.scores.find((s) => s.criterionId === c.id)
      scores[c.id] = found?.score ?? 0
    }
    await db.educatorRating.upsert({
      where: { userId_categoryId_period: { userId: row.userId, categoryId, period } },
      update: { finalized: true, finalizedAt: now },
      create: { userId: row.userId, categoryId, period, ratedById: user.id, scores, finalized: true, finalizedAt: now },
    })
  }

  const periodLabel = new Date(`${period}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  await Promise.all(rows.map((row, i) =>
    db.notification.create({
      data: {
        userId: row.userId,
        title: i < 3 ? `🏆 ${category.name} — Rank #${i + 1} This Month!` : `📊 ${category.name} Monthly Report Ready`,
        message: i < 3
          ? `Congratulations! You ranked #${i + 1} in ${category.name} for ${periodLabel} with an average score of ${row.average}/10. Your e-certificate is ready to download.`
          : `Your ${category.name} performance report for ${periodLabel} is ready — rank #${row.rank}, average ${row.average}/10. View it in Recognition.`,
        type: 'RATING',
        relatedId: `${categoryId}:${period}`,
      },
    }).catch(() => {})
  ))

  return NextResponse.json({ ok: true, finalized: rows.length, period, category: category.name })
}
