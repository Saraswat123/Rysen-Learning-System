export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const published = searchParams.get('published') === 'true'
    const branchId = searchParams.get('branchId') || undefined
    const programs = await db.program.findMany({
      where: {
        ...(published ? { isPublished: true } : {}),
        // A program with no campuses allocated applies to everyone (default,
        // keeps anything created before this feature working unchanged).
        ...(branchId ? { OR: [{ branches: { none: {} } }, { branches: { some: { id: branchId } } }] } : {}),
      },
      orderBy: { order: 'asc' },
      include: { _count: { select: { stages: true } }, branches: { select: { id: true, name: true } } },
    })
    return NextResponse.json(programs)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  try {
    const { branchIds, ...data } = await req.json()
    const maxOrder = await db.program.aggregate({ _max: { order: true } })
    const program = await db.program.create({
      data: {
        ...data,
        order: (maxOrder._max.order ?? -1) + 1,
        ...(Array.isArray(branchIds) && branchIds.length > 0
          ? { branches: { connect: branchIds.map((id: string) => ({ id })) } }
          : {}),
      },
      include: { branches: { select: { id: true, name: true } } },
    })
    return NextResponse.json(program, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
