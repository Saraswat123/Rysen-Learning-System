export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get('branchId')
    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN

    // For educators: get their group memberships to filter resources
    let educatorGroupIds: string[] | null = null
    if (!isAdmin) {
      const memberships = await db.educatorGroupMember.findMany({
        where: { userId: user.id },
        select: { groupId: true },
      })
      educatorGroupIds = memberships.map((m) => m.groupId)
    }

    const branchFilter = branchId
      ? { OR: [{ branchId }, { branchId: null }] }
      : user.branchId
      ? { OR: [{ branchId: user.branchId }, { branchId: null }] }
      : {}

    const resources = await db.resource.findMany({
      where: {
        ...(isAdmin ? {} : { isPublished: true }),
        ...branchFilter,
        // Educators see: resources with no group (everyone) OR resources for their groups
        ...(educatorGroupIds !== null
          ? { OR: [{ groupId: null }, { groupId: { in: educatorGroupIds } }] }
          : {}),
      },
      include: {
        branch: { select: { id: true, name: true } },
        group: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(resources)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const data = await req.json()
    const resource = await db.resource.create({
      data: {
        title: data.title?.trim(),
        description: data.description?.trim() || null,
        url: data.url?.trim() || null,
        type: data.type ?? 'LINK',
        category: data.category?.trim() || 'General',
        isPublished: data.isPublished ?? true,
        isPinned: data.isPinned ?? false,
        branchId: data.branchId || null,
        groupId: data.groupId || null,
      },
      include: {
        branch: { select: { id: true, name: true } },
        group: { select: { id: true, name: true, color: true } },
      },
    })
    return NextResponse.json(resource)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
