export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getStudentSession } from '@/lib/student-auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const forStudent = searchParams.get('student') === 'true'

    if (forStudent) {
      const student = await getStudentSession()
      if (!student) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const programs = await db.studentProgram.findMany({
        where: {
          isPublished: true,
          OR: [{ branchId: null }, { branchId: student.branchId ?? undefined }],
        },
        include: { _count: { select: { tests: true } } },
        orderBy: { order: 'asc' },
      })
      return NextResponse.json(programs)
    }

    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.EDUCATOR)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const where = user.role === Role.EDUCATOR && user.branchId
      ? { OR: [{ branchId: null }, { branchId: user.branchId }] }
      : {}

    const programs = await db.studentProgram.findMany({
      where,
      include: {
        _count: { select: { tests: true } },
        branch: { select: { id: true, name: true } },
        createdByUser: { select: { name: true } },
      },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json(programs)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.EDUCATOR)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const body = await req.json()

    const branchId = user.role === Role.EDUCATOR ? (user.branchId ?? null) : (body.branchId || null)

    const maxOrder = await db.studentProgram.aggregate({ _max: { order: true } })
    const program = await db.studentProgram.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        targetClass: body.targetClass ?? '',
        isPublished: body.isPublished ?? true,
        order: (maxOrder._max.order ?? 0) + 1,
        branchId,
        createdById: user.id,
      },
      include: { branch: { select: { id: true, name: true } } },
    })
    return NextResponse.json(program, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
