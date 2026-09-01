export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

function isAdmin(role: Role) {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || !isAdmin(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id: categoryId } = await params
  const category = await db.recognitionCategory.findUnique({
    where: { id: categoryId },
    include: { group: { include: { members: { include: { user: { include: { branch: true } } } } } } },
  })
  if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

  const memberIds = new Set(category.group.members.map((m) => m.userId))
  const allEducators = await db.user.findMany({
    where: { role: Role.EDUCATOR, isActive: true },
    include: { branch: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({
    members: category.group.members.map((m) => ({
      userId: m.user.id, name: m.user.name, email: m.user.email,
      branch: m.user.branch?.name ?? null, avatarUrl: m.user.avatarUrl,
    })),
    candidates: allEducators
      .filter((e) => !memberIds.has(e.id))
      .map((e) => ({ userId: e.id, name: e.name, email: e.email, branch: e.branch?.name ?? null })),
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || !isAdmin(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id: categoryId } = await params
  const { userId } = await req.json() as { userId: string }

  const category = await db.recognitionCategory.findUnique({ where: { id: categoryId } })
  if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

  await db.educatorGroupMember.upsert({
    where: { groupId_userId: { groupId: category.groupId, userId } },
    update: {},
    create: { groupId: category.groupId, userId },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || !isAdmin(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id: categoryId } = await params
  const body = await req.json() as { userId?: string; userIds?: string[] }
  const ids = body.userIds ?? (body.userId ? [body.userId] : [])
  if (ids.length === 0) return NextResponse.json({ error: 'No userId(s) provided' }, { status: 400 })

  const category = await db.recognitionCategory.findUnique({ where: { id: categoryId } })
  if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

  const { count } = await db.educatorGroupMember.deleteMany({ where: { groupId: category.groupId, userId: { in: ids } } })
  return NextResponse.json({ ok: true, removed: count })
}
