export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json() as { role?: string; resetPassword?: boolean }

  if (body.resetPassword === true) {
    const updated = await db.user.update({
      where: { id },
      data: { password: null, passwordSetAt: null },
    })
    return NextResponse.json(updated)
  }

  if (!body.role || !['ADMIN', 'SUPER_ADMIN'].includes(body.role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const updated = await db.user.update({ where: { id }, data: { role: body.role as Role } })
  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  if (id === user.id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })

  await db.user.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
