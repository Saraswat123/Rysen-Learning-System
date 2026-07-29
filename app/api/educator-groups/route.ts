export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN

  const groups = await db.educatorGroup.findMany({
    where: isAdmin ? {} : { members: { some: { userId: user.id } } },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, branch: { select: { name: true } } } } } },
      resources: {
        where: { isPublished: true },
        select: { id: true, title: true, description: true, url: true, type: true, category: true },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      },
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(groups)
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { name, description, color, memberIds } = await req.json()
  const group = await db.educatorGroup.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      color: color || '#033D4C',
      members: memberIds?.length
        ? { create: (memberIds as string[]).map((userId: string) => ({ userId })) }
        : undefined,
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, branch: { select: { name: true } } } } } },
    },
  })
  return NextResponse.json(group)
}
