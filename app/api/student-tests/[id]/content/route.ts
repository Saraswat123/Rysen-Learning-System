export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const blocks = await db.studentTestContent.findMany({
      where: { testId: id },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json(blocks)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.EDUCATOR)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const { id: testId } = await params
    const body = await req.json() as Array<{ type: string; title: string; url: string; order?: number }>

    await db.studentTestContent.deleteMany({ where: { testId } })
    if (body.length > 0) {
      await db.studentTestContent.createMany({
        data: body.map((b, i) => ({
          testId,
          type: b.type,
          title: b.title,
          url: b.url,
          order: b.order ?? i,
        })),
      })
    }
    const blocks = await db.studentTestContent.findMany({
      where: { testId },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json(blocks)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
