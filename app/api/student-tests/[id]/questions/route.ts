export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.EDUCATOR)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const { id } = await params
    const questions = await db.studentQuestion.findMany({
      where: { testId: id },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json(questions)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.EDUCATOR)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const { id: testId } = await params
    const body = await req.json()

    const maxOrder = await db.studentQuestion.aggregate({
      where: { testId },
      _max: { order: true },
    })

    const question = await db.studentQuestion.create({
      data: {
        testId,
        type: body.type ?? 'MCQ',
        text: body.text,
        imageUrl: body.imageUrl ?? null,
        videoUrl: body.videoUrl ?? null,
        options: body.options ?? [],
        correctId: body.correctId ?? '',
        explanation: body.explanation ?? null,
        order: (maxOrder._max.order ?? 0) + 1,
        marks: body.marks ?? 1,
      },
    })
    return NextResponse.json(question, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.EDUCATOR)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const { id: testId } = await params
    const body = await req.json() as Array<{
      id?: string; type?: string; text: string; imageUrl?: string | null
      videoUrl?: string | null; options?: unknown[]; correctId?: string
      explanation?: string | null; order?: number; marks?: number
    }>

    await db.studentQuestion.deleteMany({ where: { testId } })
    if (body.length > 0) {
      await db.studentQuestion.createMany({
        data: body.map((q, i) => ({
          testId,
          type: q.type ?? 'MCQ',
          text: q.text,
          imageUrl: q.imageUrl ?? null,
          videoUrl: q.videoUrl ?? null,
          options: (q.options ?? []) as object[],
          correctId: q.correctId ?? '',
          explanation: q.explanation ?? null,
          order: q.order ?? i,
          marks: q.marks ?? 1,
        })),
      })
    }
    const questions = await db.studentQuestion.findMany({
      where: { testId },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json(questions)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
