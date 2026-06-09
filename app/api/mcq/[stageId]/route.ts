import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { QuestionType } from '@/app/generated/prisma/client'

export async function POST(req: NextRequest, { params }: { params: Promise<{ stageId: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { stageId } = await params
  // answers: MCQ = { questionId: optionId }, textAnswers: { questionId: responseText }
  const { answers = {}, textAnswers = {} } = await req.json()

  const stage = await db.stage.findUnique({
    where: { id: stageId },
    include: { questions: { orderBy: { order: 'asc' } } },
  })
  if (!stage) return NextResponse.json({ error: 'Stage not found' }, { status: 404 })

  const progress = await db.stageProgress.findUnique({
    where: { userId_stageId: { userId: user.id, stageId } },
  })

  if (progress && progress.attempts >= stage.maxAttempts && !progress.passed) {
    return NextResponse.json({ error: 'Max attempts reached' }, { status: 403 })
  }

  const mcqQuestions = stage.questions.filter((q) => q.type === QuestionType.MCQ)
  const textQuestions = stage.questions.filter((q) => q.type === QuestionType.TEXT)

  // Save text responses
  for (const q of textQuestions) {
    const response = textAnswers[q.id]?.trim()
    if (response) {
      await db.textResponse.upsert({
        where: { userId_questionId: { userId: user.id, questionId: q.id } },
        update: { response },
        create: { userId: user.id, questionId: q.id, response },
      })
    }
  }

  // Score only MCQ questions
  let correct = 0
  const mcqResults = mcqQuestions.map((q) => {
    const selected = answers[q.id]
    const isCorrect = selected === q.correctId
    if (isCorrect) correct++
    return { questionId: q.id, type: 'MCQ', selected, correct: q.correctId, isCorrect, explanation: q.explanation }
  })

  const textResults = textQuestions.map((q) => ({
    questionId: q.id,
    type: 'TEXT',
    response: textAnswers[q.id] ?? '',
    isCorrect: true,
    explanation: q.explanation,
  }))

  const total = mcqQuestions.length
  const score = total > 0 ? Math.round((correct / total) * 100) : 100
  const passed = score >= stage.passScore

  const newAttempts = (progress?.attempts ?? 0) + 1
  const bestScore = Math.max(progress?.bestScore ?? 0, score)

  const updated = await db.stageProgress.upsert({
    where: { userId_stageId: { userId: user.id, stageId } },
    update: {
      attempts: newAttempts,
      bestScore,
      passed: passed || (progress?.passed ?? false),
      completedAt: passed && !progress?.passed ? new Date() : progress?.completedAt,
    },
    create: {
      userId: user.id,
      stageId,
      attempts: 1,
      bestScore: score,
      passed,
      docRead: true,
      completedAt: passed ? new Date() : null,
    },
  })

  return NextResponse.json({
    score,
    passed,
    correct,
    total,
    attemptsUsed: updated.attempts,
    attemptsRemaining: stage.maxAttempts - updated.attempts,
    results: [...mcqResults, ...textResults],
  })
}
