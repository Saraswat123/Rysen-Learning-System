import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role, QuestionType } from '@/app/generated/prisma/client'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const questions = await db.question.findMany({
    where: { stageId: id },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(questions)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id: stageId } = await params
  const body = await req.json()

  if (Array.isArray(body)) {
    await db.question.deleteMany({ where: { stageId } })
    const questions = await db.question.createMany({
      data: body.map((q: { type?: string; text: string; options: object; correctId: string; explanation?: string }, i: number) => ({
        stageId,
        type: q.type === 'TEXT' ? QuestionType.TEXT : QuestionType.MCQ,
        text: q.text,
        options: q.type === 'TEXT' ? [] : q.options as object,
        correctId: q.type === 'TEXT' ? '' : q.correctId,
        explanation: q.explanation ?? null,
        order: i,
      })),
    })
    return NextResponse.json(questions, { status: 201 })
  }

  const question = await db.question.create({ data: { stageId, ...body } })
  return NextResponse.json(question, { status: 201 })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id: stageId } = await params
  await db.question.deleteMany({ where: { stageId } })
  return NextResponse.json({ ok: true })
}
