export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id } = await params
  const body = await req.json()
  const group = await db.taskGroup.update({ where: { id }, data: { title: body.title, description: body.description ?? null, color: body.color } })
  return NextResponse.json(group)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id } = await params
  await db.taskGroup.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
