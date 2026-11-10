export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { countedStageWhere, isStageForRole } from '@/lib/stage-audience'
import { QuestionType, Role } from '@/app/generated/prisma/client'

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
  if (!stage || !isStageForRole(stage, user.role)) return NextResponse.json({ error: 'Stage not found' }, { status: 404 })

  const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN
  if (stage.programId && !isAdmin) {
    const enrolled = await db.programEnrollment.findUnique({
      where: { userId_programId: { userId: user.id, programId: stage.programId } },
    })
    if (!enrolled) return NextResponse.json({ error: 'Not enrolled in this program' }, { status: 403 })
  }

  // Reserve the attempt under a per-(user, stage) lock so parallel submits can't exceed maxAttempts
  const progress = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`mcq:${user.id}:${stageId}`}))`
    const current = await tx.stageProgress.findUnique({ where: { userId_stageId: { userId: user.id, stageId } } })
    if (current && current.attempts >= stage.maxAttempts && !current.passed) return { blocked: true as const }
    await tx.stageProgress.upsert({
      where: { userId_stageId: { userId: user.id, stageId } },
      update: { attempts: { increment: 1 } },
      create: { userId: user.id, stageId, attempts: 1, bestScore: 0, passed: false, docRead: true },
    })
    return { blocked: false as const, current }
  })
  if (progress.blocked) return NextResponse.json({ error: 'Max attempts reached' }, { status: 403 })
  const previous = progress.current

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

  const bestScore = Math.max(previous?.bestScore ?? 0, score)

  const updated = await db.stageProgress.upsert({
    where: { userId_stageId: { userId: user.id, stageId } },
    update: {
      bestScore,
      passed: passed || (previous?.passed ?? false),
      completedAt: passed && !previous?.passed ? new Date() : previous?.completedAt,
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

  // Newly passed this attempt — check if this completes the whole programme, fire certificate notification
  const justPassed = passed && !previous?.passed
  if (justPassed) {
    const siblingStages = await db.stage.findMany({
      where: { programId: stage.programId, ...countedStageWhere(user.role) },
      include: { progress: { where: { userId: user.id } } },
    })
    const allPassed = siblingStages.every((s) =>
      s.id === stageId ? true : s.progress[0]?.passed === true
    )
    if (allPassed) {
      const programName = stage.programId
        ? (await db.program.findUnique({ where: { id: stage.programId }, select: { name: true } }))?.name
        : 'RYSEN Professional Development & Onboarding Programme'
      await db.notification.create({
        data: {
          userId: user.id,
          title: '🎓 Certificate Unlocked!',
          message: `You've completed all stages of "${programName ?? 'the programme'}". Your e-certificate is ready to download.`,
          type: 'CERTIFICATE',
          relatedId: stage.programId ?? null,
        },
      }).catch(() => {})
    }
  }

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
