export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

function isAdmin(role: Role) {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || !isAdmin(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id: categoryId } = await params
  const { label, isAutoTest } = await req.json() as { label: string; isAutoTest?: boolean }
  if (!label?.trim()) return NextResponse.json({ error: 'Label required' }, { status: 400 })

  const maxOrder = await db.ratingCriterion.aggregate({ where: { categoryId }, _max: { order: true } })
  const criterion = await db.ratingCriterion.create({
    data: { categoryId, label: label.trim(), isAutoTest: !!isAutoTest, order: (maxOrder._max.order ?? -1) + 1 },
  })
  return NextResponse.json(criterion, { status: 201 })
}
