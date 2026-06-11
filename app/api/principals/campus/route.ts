export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET() {
  const user = await requireAuth([Role.PRINCIPAL])
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  if (!user.branchId) {
    return NextResponse.json({ educators: [], stages: [] })
  }

  const [educators, stages] = await Promise.all([
    db.user.findMany({
      where: { branchId: user.branchId, role: Role.EDUCATOR, isActive: true },
      include: {
        progress: { include: { stage: { select: { number: true, title: true } } } },
      },
      orderBy: { name: 'asc' },
    }),
    db.stage.findMany({ where: { isPublished: true }, orderBy: { number: 'asc' } }),
  ])

  return NextResponse.json({ educators, stages })
}
