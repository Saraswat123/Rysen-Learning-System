export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse, after } from 'next/server'
import { db } from '@/lib/db'
import { getStudentSession } from '@/lib/student-auth'
import { syncStudentSheetRow } from '@/lib/student-sheet-sync'
import { isAnswerMap, MAX_ATTEMPTS_PER_TEST, studentTestBlock } from '@/lib/student-test-access'

class AlreadyAttempted extends Error {}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const student = await getStudentSession()
    if (!student) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: testId } = await params
    const body = await req.json().catch(() => null)
    const answers = body?.answers
    if (!isAnswerMap(answers)) return NextResponse.json({ error: 'Invalid answers' }, { status: 400 })

    const test = await db.studentTest.findUnique({
      where: { id: testId },
      include: { questions: true },
    })
    if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    const block = studentTestBlock(test, student)
    if (block) return NextResponse.json({ error: block.error }, { status: block.status })

    let score = 0
    let totalMarks = 0
    for (const q of test.questions) {
      totalMarks += q.marks
      if (answers[q.id] === q.correctId) score += q.marks
    }
    const passed = totalMarks > 0 && (score / totalMarks) * 100 >= test.passScore

    // Per-(student, test) advisory lock so a double-submit can't slip past the cap
    const attempt = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${student.id}:${testId}`}))`
      const prior = await tx.studentAttempt.count({ where: { studentId: student.id, testId } })
      if (prior >= MAX_ATTEMPTS_PER_TEST) throw new AlreadyAttempted()
      return tx.studentAttempt.create({
        data: { studentId: student.id, testId, score, totalMarks, passed, answers },
      })
    })

    after(() => syncStudentSheetRow(student.id).catch((err) => console.error('[sheet-sync]', err)))

    const questionsWithAnswers = test.questions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      imageUrl: q.imageUrl,
      options: q.options,
      correctId: q.correctId,
      explanation: q.explanation,
      marks: q.marks,
      yourAnswer: answers[q.id] ?? null,
      correct: answers[q.id] === q.correctId,
    }))

    return NextResponse.json({ attempt, score, totalMarks, passed, questions: questionsWithAnswers })
  } catch (err) {
    if (err instanceof AlreadyAttempted) {
      return NextResponse.json({ error: 'You have already submitted this test.' }, { status: 409 })
    }
    console.error('[student-tests/attempt]', err)
    return NextResponse.json({ error: 'Could not submit the test. Please try again.' }, { status: 500 })
  }
}
