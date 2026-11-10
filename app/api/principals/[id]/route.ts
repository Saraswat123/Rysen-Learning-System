export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()

  const target = await db.user.findUnique({ where: { id }, select: { role: true } })
  if (!target || target.role !== Role.PRINCIPAL) {
    return NextResponse.json({ error: 'Principal not found' }, { status: 404 })
  }

  // Explicit allowlist: spreading the body let an admin set role/password on any user
  const data: { name?: string; phone?: string | null; branchId?: string | null; isActive?: boolean } = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (body.phone === null || typeof body.phone === 'string') data.phone = body.phone || null
  if (body.branchId === null || typeof body.branchId === 'string') data.branchId = body.branchId || null
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive
  const updated = await db.user.update({ where: { id }, data, include: { branch: true } })
  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { id } = await params
  const { count } = await db.user.deleteMany({ where: { id, role: Role.PRINCIPAL } })
  if (count === 0) return NextResponse.json({ error: 'Principal not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
