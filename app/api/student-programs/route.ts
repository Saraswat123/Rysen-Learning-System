export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { educatorBranchListWhere } from '@/lib/branch-scope'
import { getStudentSession } from '@/lib/student-auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const forStudent = searchParams.get('student') === 'true'

    if (forStudent) {
      const student = await getStudentSession()
      if (!student) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const now = new Date()
      const programs = await db.studentProgram.findMany({
        where: {
          isPublished: true,
          AND: [
            educatorBranchListWhere(student.branchId),
            { OR: [{ targetClass: '' }, { targetClass: student.class }] },
          ],
        },
        include: {
          enrollments: { where: { studentId: student.id }, select: { id: true } },
          contentBlocks: { orderBy: { order: 'asc' } },
          tests: {
            where: {
              isPublished: true,
              AND: [
                educatorBranchListWhere(student.branchId),
                { OR: [{ targetClass: '' }, { targetClass: student.class }] },
                { OR: [{ startAt: null }, { startAt: { lte: now } }] },
                { OR: [{ endAt: null }, { endAt: { gte: now } }] },
              ],
            },
            select: { id: true, title: true, targetClass: true, order: true },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      })
      return NextResponse.json(programs.map(({ enrollments, ...program }) => ({ ...program, isEnrolled: enrollments.length > 0 })))
    }

    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.EDUCATOR)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const where = user.role === Role.EDUCATOR ? educatorBranchListWhere(user.branchId) : {}

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
    console.error('[student-programs]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.EDUCATOR)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    if (user.role === Role.EDUCATOR && !user.branchId) {
      return NextResponse.json({ error: 'Your account has no campus assigned. Ask an admin to set one.' }, { status: 400 })
    }
    const body = await req.json()
    if (!body || typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 160) {
      return NextResponse.json({ error: 'Program title is required (160 characters max)' }, { status: 400 })
    }
    if (typeof body.description === 'string' && body.description.length > 4000) {
      return NextResponse.json({ error: 'Description must be 4,000 characters or less' }, { status: 400 })
    }

    const branchId = user.role === Role.EDUCATOR ? (user.branchId ?? null) : (body.branchId || null)
    if (branchId && typeof branchId !== 'string') {
      return NextResponse.json({ error: 'Invalid campus' }, { status: 400 })
    }
    if (branchId && user.role !== Role.EDUCATOR) {
      const branch = await db.branch.findUnique({ where: { id: branchId }, select: { id: true } })
      if (!branch) return NextResponse.json({ error: 'Campus not found' }, { status: 400 })
    }

    const maxOrder = await db.studentProgram.aggregate({ _max: { order: true } })
    const program = await db.studentProgram.create({
      data: {
        title: body.title.trim(),
        description: body.description ?? null,
        targetClass: body.targetClass ?? '',
        isPublished: body.isPublished ?? false,
        order: (maxOrder._max.order ?? 0) + 1,
        branchId,
        createdById: user.id,
      },
      include: { branch: { select: { id: true, name: true } } },
    })
    return NextResponse.json(program, { status: 201 })
  } catch (err) {
    console.error('[student-programs]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
