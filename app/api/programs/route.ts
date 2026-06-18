export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET() {
  try {
    const programs = await db.program.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { stages: true } } },
    })
    return NextResponse.json(programs)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  try {
    const data = await req.json()
    const maxOrder = await db.program.aggregate({ _max: { order: true } })
    const program = await db.program.create({
      data: { ...data, order: (maxOrder._max.order ?? -1) + 1 },
    })
    return NextResponse.json(program, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
