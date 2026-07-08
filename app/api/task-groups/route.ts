export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const groups = await db.taskGroup.findMany({
    include: { _count: { select: { tasks: true } }, createdBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(groups)
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { title, description, color } = await req.json()
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  const group = await db.taskGroup.create({
    data: { title, description: description ?? null, color: color ?? '#033D4C', createdById: user.id },
  })
  return NextResponse.json(group, { status: 201 })
}
