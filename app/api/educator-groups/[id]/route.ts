export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

async function adminOnly() {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) return null
  return user
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await adminOnly()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id } = await params
  const { name, description, color, memberIds } = await req.json()

  // If memberIds provided, replace members entirely
  if (memberIds !== undefined) {
    await db.educatorGroupMember.deleteMany({ where: { groupId: id } })
    if ((memberIds as string[]).length > 0) {
      await db.educatorGroupMember.createMany({
        data: (memberIds as string[]).map((userId: string) => ({ groupId: id, userId })),
        skipDuplicates: true,
      })
    }
  }

  const group = await db.educatorGroup.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(color !== undefined && { color }),
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, branch: { select: { name: true } } } } } },
    },
  })
  return NextResponse.json(group)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await adminOnly()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id } = await params
  await db.educatorGroup.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
