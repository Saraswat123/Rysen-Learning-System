export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id: taskId } = await params
  const { title, deadline } = await req.json()
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  const max = await db.subTask.aggregate({ where: { taskId }, _max: { order: true } })
  const sub = await db.subTask.create({ data: { taskId, title, deadline: deadline ? new Date(deadline) : null, order: (max._max.order ?? 0) + 1 } })
  return NextResponse.json(sub, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { subId } = await req.json()
  await db.subTask.delete({ where: { id: subId } })
  return NextResponse.json({ ok: true })
}
