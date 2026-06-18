export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const programId = searchParams.get('programId')

    const stages = await db.stage.findMany({
      where: programId ? { programId } : undefined,
      orderBy: { number: 'asc' },
      include: { _count: { select: { questions: true } } },
    })
    return NextResponse.json(stages)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const data = await req.json()
    // Always use global max number so any leftover unique constraint doesn't block new stages
    const maxNum = await db.stage.aggregate({ _max: { number: true } })
    const number = (maxNum._max.number ?? 0) + 1
    const stage = await db.stage.create({ data: { ...data, number } })
    return NextResponse.json(stage, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
