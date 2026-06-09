export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET() {
  const stages = await db.stage.findMany({
    orderBy: { number: 'asc' },
    include: { _count: { select: { questions: true } } },
  })
  return NextResponse.json(stages)
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const data = await req.json()
  const stage = await db.stage.create({ data })
  return NextResponse.json(stage, { status: 201 })
}
