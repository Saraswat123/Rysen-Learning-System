export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

// Admin: list enrolled educators
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { id: programId } = await params
  const enrollments = await db.programEnrollment.findMany({
    where: { programId },
    include: { user: { include: { branch: true } } },
    orderBy: { enrolledAt: 'asc' },
  })
  return NextResponse.json(enrollments)
}

// Admin: bulk enroll educators by userId array
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { id: programId } = await params
  const { userIds }: { userIds: string[] } = await req.json()

  let added = 0
  for (const userId of userIds) {
    try {
      await db.programEnrollment.create({ data: { userId, programId } })
      added++
    } catch { /* already enrolled */ }
  }
  return NextResponse.json({ ok: true, added })
}

// Admin: remove educator from program
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { id: programId } = await params
  const { userId } = await req.json()
  await db.programEnrollment.deleteMany({ where: { userId, programId } })
  return NextResponse.json({ ok: true })
}
