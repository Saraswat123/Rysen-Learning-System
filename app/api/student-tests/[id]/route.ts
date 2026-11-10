export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { MAX_ATTEMPTS_PER_TEST, studentTestBlock } from '@/lib/student-test-access'
import { getSession } from '@/lib/auth'
import { studentTestDenied } from '@/lib/branch-scope'
import { getStudentSession } from '@/lib/student-auth'
import { Role } from '@/app/generated/prisma/client'
import { seededShuffle } from '@/lib/shuffle'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const student = await getStudentSession()
    const user = student ? null : await getSession()

    if (!student && (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.EDUCATOR))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const test = await db.studentTest.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { order: 'asc' } },
        contentBlocks: { orderBy: { order: 'asc' } },
        _count: { select: { attempts: true } },
      },
    })
    if (!test) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (user) {
      const denied = await studentTestDenied(user, id, 'read')
      if (denied) return denied
    }

    if (student) {
      const block = studentTestBlock(test, student)
      if (block) {
        return NextResponse.json({ error: block.error, startAt: test.startAt, endAt: test.endAt }, { status: block.status })
      }
      const prior = await db.studentAttempt.count({ where: { studentId: student.id, testId: id } })
      if (prior >= MAX_ATTEMPTS_PER_TEST) {
        return NextResponse.json({ error: 'You have already submitted this test.', startAt: test.startAt, endAt: test.endAt }, { status: 409 })
      }
      // Per-student shuffle — same student sees the same order every time they
      // reload/resume, but no two students in the same room get matching order.
      const shuffledQuestions = seededShuffle(test.questions, `${student.id}:${test.id}`)
      const questions = shuffledQuestions.map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        imageUrl: q.imageUrl,
        videoUrl: q.videoUrl,
        options: Array.isArray(q.options) ? seededShuffle(q.options, `${student.id}:${q.id}`) : q.options,
        marks: q.marks,
        order: q.order,
      }))
      return NextResponse.json({ ...test, questions })
    }

    return NextResponse.json(test)
  } catch (err) {
    console.error('[student-tests/[id]]', err)
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
    const denied = await studentTestDenied(user, id, 'edit')
    if (denied) return denied
    const body = await req.json()
    const test = await db.studentTest.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.subject !== undefined && { subject: body.subject }),
        ...(body.targetClass !== undefined && { targetClass: body.targetClass }),
        ...(body.timeLimitMinutes !== undefined && { timeLimitMinutes: body.timeLimitMinutes }),
        ...(body.passScore !== undefined && { passScore: body.passScore }),
        ...(body.isPublished !== undefined && { isPublished: body.isPublished }),
        ...(body.order !== undefined && { order: body.order }),
        ...(user.role !== Role.EDUCATOR && body.branchId !== undefined && { branchId: body.branchId || null }),
        ...(body.startAt !== undefined && { startAt: body.startAt ? new Date(body.startAt) : null }),
        ...(body.endAt !== undefined && { endAt: body.endAt ? new Date(body.endAt) : null }),
      },
    })
    return NextResponse.json(test)
  } catch (err) {
    console.error('[student-tests/[id]]', err)
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
    const denied = await studentTestDenied(user, id, 'edit')
    if (denied) return denied
    await db.studentTest.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[student-tests/[id]]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
