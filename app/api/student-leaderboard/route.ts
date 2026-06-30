export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStudentSession } from '@/lib/student-auth'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const student = await getStudentSession()
    const admin = student ? null : await getSession()
    if (!student && !admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const testId = searchParams.get('testId')
    const cls = searchParams.get('class')

    const attempts = await db.studentAttempt.findMany({
      where: {
        ...(testId ? { testId } : {}),
        ...(cls ? { student: { class: cls } } : {}),
      },
      include: {
        student: { include: { branch: true } },
        test: { select: { id: true, title: true } },
      },
      orderBy: { completedAt: 'desc' },
    })

    const bestByStudent = new Map<string, {
      student: typeof attempts[0]['student']
      totalScore: number
      totalMarks: number
      passed: number
      tests: number
    }>()

    for (const a of attempts) {
      const key = a.studentId
      if (!bestByStudent.has(key)) {
        bestByStudent.set(key, { student: a.student, totalScore: 0, totalMarks: 0, passed: 0, tests: 0 })
      }
      const entry = bestByStudent.get(key)!
      entry.totalScore += a.score
      entry.totalMarks += a.totalMarks
      if (a.passed) entry.passed++
      entry.tests++
    }

    const leaderboard = Array.from(bestByStudent.values())
      .sort((a, b) => {
        const scoreA = a.totalMarks > 0 ? a.totalScore / a.totalMarks : 0
        const scoreB = b.totalMarks > 0 ? b.totalScore / b.totalMarks : 0
        return scoreB - scoreA
      })
      .map((entry, i) => ({
        rank: i + 1,
        student: entry.student,
        totalScore: entry.totalScore,
        totalMarks: entry.totalMarks,
        percentage: entry.totalMarks > 0 ? Math.round((entry.totalScore / entry.totalMarks) * 100) : 0,
        passed: entry.passed,
        tests: entry.tests,
      }))

    return NextResponse.json(leaderboard)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
