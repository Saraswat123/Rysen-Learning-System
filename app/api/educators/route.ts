export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET() {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const educators = await db.user.findMany({
    where: { role: Role.EDUCATOR },
    include: {
      branch: true,
      progress: { include: { stage: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(educators)
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { name, email, phone, branchId } = await req.json()
  if (!name || !email || !branchId) {
    return NextResponse.json({ error: 'Name, email, and branch are required' }, { status: 400 })
  }

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })

  const educator = await db.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      role: Role.EDUCATOR,
      branchId,
      createdBy: user.id,
    },
    include: { branch: true },
  })
  return NextResponse.json(educator, { status: 201 })
}
