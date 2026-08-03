export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStudentSession } from '@/lib/student-auth'
import { sheetsEnabled, updateStudentRow } from '@/lib/google-sheets'

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

    // Fire-and-forget sheet update (non-blocking)
    if (sheetsEnabled()) {
      db.student.findUnique({
        where: { id: student.id },
        include: {
          branch: { select: { name: true } },
          attempts: { orderBy: { completedAt: 'desc' }, include: { test: { select: { title: true } } } },
        },
      }).then((s) => {
        if (!s) return
        const allAttempts = s.attempts
        const passedCount = allAttempts.filter((a) => a.passed).length
        const scores = allAttempts.map((a) => a.totalMarks > 0 ? Math.round((a.score / a.totalMarks) * 100) : 0)
        const avg = scores.length > 0 ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) : 0
        const last = allAttempts[0]
        const lastPct = last && last.totalMarks > 0 ? Math.round((last.score / last.totalMarks) * 100) : 0
        updateStudentRow(s.branch?.name ?? '', s.name, {
          totalTests: allAttempts.length,
          testsPassed: passedCount,
          avgScore: avg,
          lastTestTitle: last?.test.title ?? '',
          lastScore: lastPct,
          lastPassed: last?.passed ?? false,
          lastDate: new Date(last?.completedAt ?? new Date()).toLocaleDateString('en-IN'),
        }).catch(() => {})
      }).catch(() => {})
    }

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
