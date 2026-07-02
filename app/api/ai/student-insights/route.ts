export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getAIInsights } from '@/lib/groq'
import { Role } from '@/app/generated/prisma/client'

export async function GET() {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const [totalStudents, totalTests, attempts, tests, students] = await Promise.all([
    db.student.count({ where: { isActive: true } }),
    db.studentTest.count(),
    db.studentAttempt.findMany({
      include: {
        test: { select: { id: true, title: true, subject: true, targetClass: true, passScore: true } },
        student: { select: { id: true, name: true, class: true, section: true } },
      },
    }),
    db.studentTest.findMany({
      include: { _count: { select: { questions: true, attempts: true } } },
      orderBy: { order: 'asc' },
    }),
    db.student.findMany({
      where: { isActive: true },
      include: { attempts: true },
      orderBy: { name: 'asc' },
    }),
  ])

  // Per-test stats
  const testStats = tests.map((t) => {
    const testAttempts = attempts.filter((a) => a.testId === t.id)
    const passed = testAttempts.filter((a) => a.passed).length
    const avgScore = testAttempts.length > 0
      ? Math.round(testAttempts.reduce((s, a) => s + (a.totalMarks > 0 ? (a.score / a.totalMarks) * 100 : 0), 0) / testAttempts.length)
      : 0
    return {
      id: t.id,
      title: t.title,
      subject: t.subject,
      targetClass: t.targetClass,
      passScore: t.passScore,
      questions: t._count.questions,
      totalAttempts: testAttempts.length,
      passed,
      failed: testAttempts.length - passed,
      passRate: testAttempts.length > 0 ? Math.round((passed / testAttempts.length) * 100) : 0,
      avgScore,
    }
  })

  // Per-class stats
  const classMap = new Map<string, { attempts: number; passed: number; totalScore: number; totalMarks: number }>()
  for (const a of attempts) {
    const cls = a.student.class
    const prev = classMap.get(cls) ?? { attempts: 0, passed: 0, totalScore: 0, totalMarks: 0 }
    classMap.set(cls, {
      attempts: prev.attempts + 1,
      passed: prev.passed + (a.passed ? 1 : 0),
      totalScore: prev.totalScore + a.score,
      totalMarks: prev.totalMarks + a.totalMarks,
    })
  }
  const classStats = Array.from(classMap.entries()).map(([cls, d]) => ({
    class: cls,
    attempts: d.attempts,
    passed: d.passed,
    passRate: d.attempts > 0 ? Math.round((d.passed / d.attempts) * 100) : 0,
    avgScore: d.totalMarks > 0 ? Math.round((d.totalScore / d.totalMarks) * 100) : 0,
  })).sort((a, b) => a.class.localeCompare(b.class))

  // Top students by percentage
  const studentScores = students.map((s) => {
    const totalScore = s.attempts.reduce((sum, a) => sum + a.score, 0)
    const totalMarks = s.attempts.reduce((sum, a) => sum + a.totalMarks, 0)
    const passed = s.attempts.filter((a) => a.passed).length
    return {
      id: s.id,
      name: s.name,
      class: s.class,
      section: s.section,
      testsTaken: s.attempts.length,
      passed,
      percentage: totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0,
    }
  }).filter((s) => s.testsTaken > 0).sort((a, b) => b.percentage - a.percentage).slice(0, 10)

  // AI prompt
  const prompt = `
RYSEN Student Test Analytics Summary:
- Total active students: ${totalStudents}
- Total tests created: ${totalTests}
- Total test attempts: ${attempts.length}

Test Performance:
${testStats.map((t) => `  "${t.title}" (${t.subject || 'General'}, Class ${t.targetClass || 'All'}): ${t.totalAttempts} attempts, ${t.passRate}% pass rate, ${t.avgScore}% avg score`).join('\n')}

Class-wise Performance:
${classStats.map((c) => `  Class ${c.class}: ${c.attempts} attempts, ${c.passRate}% pass rate, ${c.avgScore}% avg score`).join('\n')}

Top Students:
${studentScores.slice(0, 5).map((s, i) => `  ${i + 1}. ${s.name} (Class ${s.class}${s.section ? '-' + s.section : ''}): ${s.percentage}% overall, ${s.passed}/${s.testsTaken} tests passed`).join('\n')}

Provide 4-5 specific insights for the school admin. Focus on:
1. Which tests/subjects students struggle with most
2. Class-level performance gaps
3. Engagement levels (who is not attempting tests)
4. Specific recommendations to improve student outcomes
5. Recognition opportunities for top performers
Be direct, specific, and actionable. Each insight 1-2 sentences.`

  const insights = await getAIInsights(prompt)

  return NextResponse.json({
    insights,
    testStats,
    classStats,
    studentScores,
    totalStudents,
    totalTests,
    totalAttempts: attempts.length,
    overallPassRate: attempts.length > 0 ? Math.round((attempts.filter((a) => a.passed).length / attempts.length) * 100) : 0,
    overallAvgScore: attempts.length > 0
      ? Math.round(attempts.reduce((s, a) => s + (a.totalMarks > 0 ? (a.score / a.totalMarks) * 100 : 0), 0) / attempts.length)
      : 0,
  })
}
