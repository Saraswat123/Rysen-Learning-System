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

  const principals = await db.user.findMany({
    where: { role: Role.PRINCIPAL },
    include: { branch: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(principals)
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { name, email, branchId } = await req.json()
  if (!name || !email) return NextResponse.json({ error: 'Name and email required' }, { status: 400 })

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })

  const principal = await db.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: Role.PRINCIPAL,
      branchId: branchId || null,
      createdBy: user.id,
    },
    include: { branch: true },
  })

  return NextResponse.json(principal, { status: 201 })
}
