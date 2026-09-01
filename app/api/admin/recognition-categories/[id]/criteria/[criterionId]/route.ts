export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

function isAdmin(role: Role) {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; criterionId: string }> }) {
  const user = await getSession()
  if (!user || !isAdmin(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { criterionId } = await params
  const { label } = await req.json() as { label: string }
  if (!label?.trim()) return NextResponse.json({ error: 'Label required' }, { status: 400 })

  const criterion = await db.ratingCriterion.update({ where: { id: criterionId }, data: { label: label.trim() } })
  return NextResponse.json(criterion)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; criterionId: string }> }) {
  const user = await getSession()
  if (!user || !isAdmin(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { criterionId } = await params
  await db.ratingCriterion.delete({ where: { id: criterionId } })
  return NextResponse.json({ ok: true })
}
