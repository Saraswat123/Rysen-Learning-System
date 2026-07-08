export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id: taskId } = await params
  const { type, title, url } = await req.json()
  if (!title || !url) return NextResponse.json({ error: 'Title and URL required' }, { status: 400 })
  const res = await db.taskResource.create({ data: { taskId, type: type ?? 'URL', title, url } })
  return NextResponse.json(res, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { resourceId } = await req.json()
  await db.taskResource.delete({ where: { id: resourceId } })
  return NextResponse.json({ ok: true })
}
