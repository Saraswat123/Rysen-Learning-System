export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET(req: Request) {
  const withCounts = new URL(req.url).searchParams.get('counts') === '1'
  const branches = await db.branch.findMany({
    orderBy: { location: 'asc' },
    include: withCounts ? { _count: { select: { users: true, students: true } } } : undefined,
  })
  return NextResponse.json(branches)
}

export async function POST(req: Request) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { name, location } = await req.json()
  if (!name || !location) return NextResponse.json({ error: 'Name and location required' }, { status: 400 })

  const branch = await db.branch.create({ data: { name, location } })
  return NextResponse.json(branch, { status: 201 })
}
