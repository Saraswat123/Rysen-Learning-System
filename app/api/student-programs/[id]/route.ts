export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { studentProgramDenied } from '@/lib/branch-scope'
import { Role } from '@/app/generated/prisma/client'
import { parseStudentProgramContent, StudentProgramContentError, type StudentProgramContentInput } from '@/lib/student-program-content'
import { getStudentSession } from '@/lib/student-auth'
import { educatorBranchListWhere } from '@/lib/branch-scope'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (new URL(req.url).searchParams.get('student') === 'true') {
      const student = await getStudentSession()
      if (!student) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const now = new Date()
      const program = await db.studentProgram.findFirst({
        where: {
          id,
          isPublished: true,
          enrollments: { some: { studentId: student.id } },
          AND: [
            educatorBranchListWhere(student.branchId),
            { OR: [{ targetClass: '' }, { targetClass: student.class }] },
          ],
        },
        include: {
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
      })
      return program ? NextResponse.json(program) : NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.EDUCATOR)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const denied = await studentProgramDenied(user, id, 'read')
    if (denied) return denied
    const program = await db.studentProgram.findUnique({
      where: { id },
      include: {
        tests: { include: { _count: { select: { questions: true, attempts: true } } }, orderBy: { order: 'asc' } },
        contentBlocks: { orderBy: { order: 'asc' } },
        branch: { select: { id: true, name: true } },
        createdByUser: { select: { name: true } },
      },
    })
    if (!program) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(program)
  } catch (err) {
    console.error('[student-programs/[id]]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.EDUCATOR)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const { id } = await params
    const denied = await studentProgramDenied(user, id, 'edit')
    if (denied) return denied
    const body = await req.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { testIds, contentBlocks, ...data } = body as {
      testIds?: string[]; contentBlocks?: unknown; title?: string; description?: string
      targetClass?: string; isPublished?: boolean
    }
    if (data.title !== undefined && (typeof data.title !== 'string' || !data.title.trim() || data.title.trim().length > 160)) {
      return NextResponse.json({ error: 'Program title is required (160 characters max)' }, { status: 400 })
    }
    let parsedContent: StudentProgramContentInput[] | undefined
    try {
      if (contentBlocks !== undefined) parsedContent = parseStudentProgramContent(contentBlocks)
    } catch (err) {
      if (err instanceof StudentProgramContentError) return NextResponse.json({ error: err.message }, { status: 400 })
      throw err
    }

    if (testIds !== undefined) {
      if (!Array.isArray(testIds) || testIds.some((testId) => typeof testId !== 'string') || new Set(testIds).size !== testIds.length) {
        return NextResponse.json({ error: 'Invalid test list' }, { status: 400 })
      }
      const tests = testIds.length ? await db.studentTest.findMany({
        where: { id: { in: testIds } }, select: { id: true, branchId: true, programId: true },
      }) : []
      if (tests.length !== testIds.length || tests.some((test) =>
        (user.role === Role.EDUCATOR && test.branchId !== null && test.branchId !== user.branchId) ||
        (test.programId !== null && test.programId !== id))) {
        return NextResponse.json({ error: 'One or more tests are unavailable for this program' }, { status: 400 })
      }
    }

    const program = await db.$transaction(async (tx) => {
      const updated = await tx.studentProgram.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title.trim() }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.targetClass !== undefined && { targetClass: data.targetClass }),
          ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
        },
      })

      if (parsedContent) {
        await tx.studentProgramContent.deleteMany({ where: { programId: id } })
        if (parsedContent.length) {
          await tx.studentProgramContent.createMany({ data: parsedContent.map((block) => ({ ...block, programId: id })) })
        }
      }
      if (Array.isArray(testIds)) {
        await tx.studentTest.updateMany({ where: { programId: id }, data: { programId: null } })
        if (testIds.length) await tx.studentTest.updateMany({ where: { id: { in: testIds } }, data: { programId: id } })
      }
      return updated
    })

    return NextResponse.json(program)
  } catch (err) {
    console.error('[student-programs/[id]]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.EDUCATOR)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const { id } = await params
    const denied = await studentProgramDenied(user, id, 'edit')
    if (denied) return denied
    // Tests become unassigned (programId = null) due to ON DELETE SET NULL — not deleted
    await db.studentProgram.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[student-programs/[id]]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
