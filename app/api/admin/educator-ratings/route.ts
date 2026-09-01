export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'
import { computeRatingsForPeriod, getStemEducatorGroup } from '@/lib/educator-ratings'

function isAdmin(role: Role) {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN
}

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user || !isAdmin(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const period = new URL(req.url).searchParams.get('period') ?? new Date().toISOString().slice(0, 7)
  const group = await getStemEducatorGroup()
  const rows = await computeRatingsForPeriod(period)

  return NextResponse.json({
    period,
    groupExists: !!group,
    groupName: group?.name ?? null,
    educators: rows,
  })
}

// Upsert one educator's 6 KRA scores + comment for a period
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || !isAdmin(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const body = await req.json() as {
    userId: string; period: string
    kra1: number; kra2: number; kra3: number; kra4: number; kra5: number; kra6: number
    comment?: string
  }

  const clamp = (n: number) => Math.max(0, Math.min(10, Math.round(n)))

  const rating = await db.educatorRating.upsert({
    where: { userId_period: { userId: body.userId, period: body.period } },
    update: {
      kra1: clamp(body.kra1), kra2: clamp(body.kra2), kra3: clamp(body.kra3),
      kra4: clamp(body.kra4), kra5: clamp(body.kra5), kra6: clamp(body.kra6),
      comment: body.comment?.trim() || null,
      ratedById: user.id,
    },
    create: {
      userId: body.userId, period: body.period,
      kra1: clamp(body.kra1), kra2: clamp(body.kra2), kra3: clamp(body.kra3),
      kra4: clamp(body.kra4), kra5: clamp(body.kra5), kra6: clamp(body.kra6),
      comment: body.comment?.trim() || null,
      ratedById: user.id,
    },
  })

  return NextResponse.json(rating)
}
