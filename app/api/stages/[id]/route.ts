export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const stage = await db.stage.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: 'asc' } } },
  })
  if (!stage) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(stage)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const data = await req.json()
  const stage = await db.stage.update({ where: { id }, data })
  return NextResponse.json(stage)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  await db.stage.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
