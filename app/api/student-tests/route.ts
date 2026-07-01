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
      const tests = await db.studentTest.findMany({
        where: { isPublished: true },
        include: { _count: { select: { questions: true } } },
        orderBy: { order: 'asc' },
      })
      const attempts = await db.studentAttempt.findMany({
        where: { studentId: student.id },
        orderBy: { completedAt: 'desc' },
      })
      const attemptMap = new Map<string, typeof attempts[0]>()
      for (const a of attempts) {
        if (!attemptMap.has(a.testId)) attemptMap.set(a.testId, a)
      }
      return NextResponse.json(tests.map((t) => ({ ...t, attempt: attemptMap.get(t.id) ?? null })))
    }

    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.EDUCATOR)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const tests = await db.studentTest.findMany({
      include: { _count: { select: { questions: true, attempts: true } } },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json(tests)
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
    const maxOrder = await db.studentTest.aggregate({ _max: { order: true } })
    const test = await db.studentTest.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        subject: body.subject ?? '',
        targetClass: body.targetClass ?? '',
        timeLimitMinutes: body.timeLimitMinutes ?? 30,
        passScore: body.passScore ?? 60,
        isPublished: body.isPublished ?? false,
        order: (maxOrder._max.order ?? 0) + 1,
        createdBy: user.role,
      },
    })
    return NextResponse.json(test, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
