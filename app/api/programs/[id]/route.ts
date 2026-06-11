export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const program = await db.program.findUnique({
    where: { id },
    include: {
      stages: {
        orderBy: { number: 'asc' },
        include: { _count: { select: { questions: true } } },
      },
    },
  })
  if (!program) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(program)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { id } = await params
  const data = await req.json()
  const program = await db.program.update({ where: { id }, data })
  return NextResponse.json(program)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { id } = await params
  // Stages become unassigned (programId = null) due to ON DELETE SET NULL
  await db.program.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
