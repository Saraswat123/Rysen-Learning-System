export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStudentSession } from '@/lib/student-auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const student = await getStudentSession()
    if (!student) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: testId } = await params
    const { answers } = await req.json() as { answers: Record<string, string> }

    const test = await db.studentTest.findUnique({
      where: { id: testId },
      include: { questions: true },
    })
    if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 })

    let score = 0
    let totalMarks = 0
    for (const q of test.questions) {
      totalMarks += q.marks
      if (answers[q.id] === q.correctId) score += q.marks
    }
    const passed = totalMarks > 0 && (score / totalMarks) * 100 >= test.passScore

    const attempt = await db.studentAttempt.create({
      data: {
        studentId: student.id,
        testId,
        score,
        totalMarks,
        passed,
        answers: answers as object,
      },
    })

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
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
