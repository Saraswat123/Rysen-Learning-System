export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const educator = await db.user.findUnique({
    where: { id },
    include: { branch: true, progress: { include: { stage: true } } },
  })
  if (!educator) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(educator)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  // Admin-triggered password reset — forces the educator to set up a new password on next login
  if (body.resetPassword === true) {
    const educator = await db.user.update({
      where: { id },
      data: { password: null, passwordSetAt: null },
      include: { branch: true },
    })
    return NextResponse.json(educator)
  }

  // Never let the generic pass-through touch password fields directly (must go through hashing)
  const { password: _password, passwordSetAt: _passwordSetAt, resetPassword: _resetPassword, ...data } = body
  const educator = await db.user.update({ where: { id }, data, include: { branch: true } })
  return NextResponse.json(educator)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  // Prevent self-delete
  if (id === user.id) return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  await db.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
