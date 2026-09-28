export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET() {
  const user = await getSession()
  if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admins = await db.user.findMany({
    where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] } },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, name: true, email: true, phone: true, role: true,
      isActive: true, createdAt: true, updatedAt: true, branchId: true,
      // Deliberately excludes: password (bcrypt hash), passwordSetAt
    },
  })
  return NextResponse.json(admins)
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Only super admin can create admins' }, { status: 403 })
  }

  const { name, email } = await req.json()
  if (!name || !email) return NextResponse.json({ error: 'Name and email required' }, { status: 400 })

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })

  const admin = await db.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: Role.ADMIN,
      createdBy: user.id,
    },
    select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
  })
  return NextResponse.json(admin, { status: 201 })
}
