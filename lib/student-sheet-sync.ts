import { db } from './db'
import { sheetsEnabled, updateStudentRow } from './google-sheets'

/** Recompute one student's totals and write them to their Google Sheet row. */
export async function syncStudentSheetRow(studentId: string) {
  if (!sheetsEnabled()) return
  const s = await db.student.findUnique({
    where: { id: studentId },
    include: {
      branch: { select: { name: true } },
      attempts: { orderBy: { completedAt: 'desc' }, include: { test: { select: { title: true } } } },
    },
  })
  if (!s) return
  const pct = (a: { score: number; totalMarks: number }) => (a.totalMarks > 0 ? Math.round((a.score / a.totalMarks) * 100) : 0)
  const scores = s.attempts.map(pct)
  const last = s.attempts[0]
  await updateStudentRow(s.id, {
    totalTests: s.attempts.length,
    testsPassed: s.attempts.filter((a) => a.passed).length,
    avgScore: scores.length > 0 ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) : 0,
    lastTestTitle: last?.test.title ?? '',
    lastScore: last ? pct(last) : 0,
    lastPassed: last?.passed ?? false,
    lastDate: (last?.completedAt ?? new Date()).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
  })
}
