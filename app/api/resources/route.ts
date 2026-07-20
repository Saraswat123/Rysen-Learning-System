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

    const resources = await db.resource.findMany({
      where: {
        ...(isAdmin ? {} : { isPublished: true }),
        ...(branchId
          ? { OR: [{ branchId }, { branchId: null }] }
          : user.branchId
          ? { OR: [{ branchId: user.branchId }, { branchId: null }] }
          : {}),
      },
      include: { branch: { select: { id: true, name: true } } },
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
        url: data.url?.trim(),
        type: data.type ?? 'LINK',
        category: data.category?.trim() || 'General',
        isPublished: data.isPublished ?? true,
        isPinned: data.isPinned ?? false,
        branchId: data.branchId || null,
      },
      include: { branch: { select: { id: true, name: true } } },
    })
    return NextResponse.json(resource)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
