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

  try {
    const { id } = await params
    const data = await req.json()
    const resource = await db.resource.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.url !== undefined && { url: data.url.trim() }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.category !== undefined && { category: data.category.trim() || 'General' }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
        ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
        ...(data.branchId !== undefined && { branchId: data.branchId || null }),
      },
      include: { branch: { select: { id: true, name: true } } },
    })
    return NextResponse.json(resource)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await adminOnly()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  try {
    const { id } = await params
    await db.resource.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
