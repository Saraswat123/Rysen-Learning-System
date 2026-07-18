export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

async function requireAdmin() {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) return null
  return user
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id } = await params
  const { name, location } = await req.json()
  if (!name || !location) return NextResponse.json({ error: 'Name and location required' }, { status: 400 })
  const branch = await db.branch.update({ where: { id }, data: { name, location } })
  return NextResponse.json(branch)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id } = await params
  const counts = await db.branch.findUnique({
    where: { id },
    select: { _count: { select: { users: true, students: true } } },
  })
  if ((counts?._count.users ?? 0) + (counts?._count.students ?? 0) > 0) {
    return NextResponse.json({ error: 'Cannot delete campus with active educators or students. Reassign them first.' }, { status: 400 })
  }
  await db.branch.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
