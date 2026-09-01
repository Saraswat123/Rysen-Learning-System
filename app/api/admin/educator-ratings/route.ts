export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'
import { computeRatingsForPeriod, listCategories, ensureRecognitionTables } from '@/lib/educator-ratings'

function isAdmin(role: Role) {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN
}

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user || !isAdmin(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  await ensureRecognitionTables()

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') ?? new Date().toISOString().slice(0, 7)
  const categories = await listCategories()
  let categoryId = searchParams.get('categoryId')
  if (!categoryId) categoryId = categories[0]?.id ?? null

  const category = categoryId ? categories.find((c) => c.id === categoryId) ?? null : null
  const rows = categoryId ? await computeRatingsForPeriod(categoryId, period) : []

  return NextResponse.json({
    period,
    categories: categories.map((c) => ({ id: c.id, name: c.name, memberCount: c.group._count.members, criteria: c.criteria })),
    selectedCategoryId: categoryId,
    criteria: category?.criteria ?? [],
    educators: rows,
  })
}

// Upsert one educator's scores for a category + period
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || !isAdmin(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  await ensureRecognitionTables()

  const body = await req.json() as {
    userId: string; categoryId: string; period: string
    scores: Record<string, number>; comment?: string
  }

  const clampedScores: Record<string, number> = {}
  for (const [k, v] of Object.entries(body.scores ?? {})) {
    clampedScores[k] = Math.max(0, Math.min(10, Math.round(Number(v))))
  }

  const rating = await db.educatorRating.upsert({
    where: { userId_categoryId_period: { userId: body.userId, categoryId: body.categoryId, period: body.period } },
    update: { scores: clampedScores, comment: body.comment?.trim() || null, ratedById: user.id },
    create: {
      userId: body.userId, categoryId: body.categoryId, period: body.period,
      scores: clampedScores, comment: body.comment?.trim() || null, ratedById: user.id,
    },
  })

  return NextResponse.json(rating)
}
