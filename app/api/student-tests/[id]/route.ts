export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getStudentSession } from '@/lib/student-auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const student = await getStudentSession()
    const user = student ? null : await getSession()

    if (!student && (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const test = await db.studentTest.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { order: 'asc' } },
        _count: { select: { attempts: true } },
      },
    })
    if (!test) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (student) {
      const questions = test.questions.map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        imageUrl: q.imageUrl,
        videoUrl: q.videoUrl,
        options: q.options,
        marks: q.marks,
        order: q.order,
      }))
      return NextResponse.json({ ...test, questions })
    }

    return NextResponse.json(test)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const { id } = await params
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
      },
    })
    return NextResponse.json(test)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const { id } = await params
    await db.studentTest.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
