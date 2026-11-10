export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const stage = await db.stage.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: 'asc' } } },
    })
    if (!stage) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN
    if (isAdmin) return NextResponse.json(stage)
    // Grading is server-side; never ship the answer key to the people taking the stage
    return NextResponse.json({ ...stage, questions: stage.questions.map(({ correctId: _correctId, ...q }) => q) })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { id } = await params
    const data = await req.json()
    const stage = await db.stage.update({ where: { id }, data })
    return NextResponse.json(stage)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
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
