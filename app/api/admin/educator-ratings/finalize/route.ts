export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'
import { computeRatingsForPeriod, getStemEducatorGroup } from '@/lib/educator-ratings'

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { period } = await req.json() as { period: string }
  if (!period) return NextResponse.json({ error: 'Period required' }, { status: 400 })

  const group = await getStemEducatorGroup()
  if (!group) return NextResponse.json({ error: 'STEM Educators group not found' }, { status: 404 })

  const rows = await computeRatingsForPeriod(period)
  const now = new Date()

  // Ensure every STEM educator has a row for this period (even unscored = 0s), then lock it
  for (const row of rows) {
    await db.educatorRating.upsert({
      where: { userId_period: { userId: row.userId, period } },
      update: { finalized: true, finalizedAt: now },
      create: {
        userId: row.userId, period, ratedById: user.id,
        kra1: row.kra1, kra2: row.kra2, kra3: row.kra3, kra4: row.kra4, kra5: row.kra5, kra6: row.kra6,
        finalized: true, finalizedAt: now,
      },
    })
  }

  const periodLabel = new Date(`${period}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  // Notify each educator — top 3 get a celebratory note, everyone else gets the report-ready note
  await Promise.all(rows.map((row, i) =>
    db.notification.create({
      data: {
        userId: row.userId,
        title: i < 3 ? `🏆 STEM Educator of the Month — Rank #${i + 1}!` : '📊 Monthly STEM Performance Report Ready',
        message: i < 3
          ? `Congratulations! You ranked #${i + 1} for ${periodLabel} with an average score of ${row.average}/10. Your e-certificate is ready to download.`
          : `Your STEM performance report for ${periodLabel} is ready — rank #${row.rank}, average ${row.average}/10. View it in Recognition.`,
        type: 'RATING',
        relatedId: period,
      },
    }).catch(() => {})
  ))

  return NextResponse.json({ ok: true, finalized: rows.length, period })
}
