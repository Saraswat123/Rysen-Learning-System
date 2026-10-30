import { db } from './db'
import { Role } from '@/app/generated/prisma/client'

export interface DigestData {
  weekStart: Date
  weekEnd: Date
  topEducators: { name: string; branch: string | null; tasksCompleted: number; stagesCompleted: number; total: number }[]
  tasks: { created: number; completed: number; overdue: number }
  resources: { added: number }
  studentTests: { attempts: number; passed: number }
  newEducators: number
}

export async function computeWeeklyDigest(): Promise<DigestData> {
  const weekEnd = new Date()
  const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [assignments, stageCompletions, tasksCreated, tasksCompleted, overdueTasks, resourcesAdded, attempts, newEducators] = await Promise.all([
    db.taskAssignment.findMany({
      where: { completedAt: { gte: weekStart, lte: weekEnd } },
      select: { userId: true, user: { select: { name: true, branch: { select: { name: true } } } } },
    }),
    db.stageProgress.findMany({
      where: { completedAt: { gte: weekStart, lte: weekEnd } },
      select: { userId: true, user: { select: { name: true, branch: { select: { name: true } } } } },
    }),
    db.task.count({ where: { createdAt: { gte: weekStart, lte: weekEnd } } }),
    db.taskAssignment.count({ where: { completedAt: { gte: weekStart, lte: weekEnd } } }),
    db.taskAssignment.count({ where: { completedAt: null, task: { deadline: { lt: weekEnd } } } }),
    db.resource.count({ where: { createdAt: { gte: weekStart, lte: weekEnd } } }),
    db.studentAttempt.findMany({ where: { completedAt: { gte: weekStart, lte: weekEnd } }, select: { passed: true } }),
    db.user.count({ where: { role: Role.EDUCATOR, createdAt: { gte: weekStart, lte: weekEnd } } }),
  ])

  const scoreByUser = new Map<string, { name: string; branch: string | null; tasksCompleted: number; stagesCompleted: number }>()
  for (const a of assignments) {
    const entry = scoreByUser.get(a.userId) ?? { name: a.user.name, branch: a.user.branch?.name ?? null, tasksCompleted: 0, stagesCompleted: 0 }
    entry.tasksCompleted++
    scoreByUser.set(a.userId, entry)
  }
  for (const s of stageCompletions) {
    const entry = scoreByUser.get(s.userId) ?? { name: s.user.name, branch: s.user.branch?.name ?? null, tasksCompleted: 0, stagesCompleted: 0 }
    entry.stagesCompleted++
    scoreByUser.set(s.userId, entry)
  }

  const topEducators = [...scoreByUser.values()]
    .map((e) => ({ ...e, total: e.tasksCompleted + e.stagesCompleted }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  return {
    weekStart, weekEnd, topEducators,
    tasks: { created: tasksCreated, completed: tasksCompleted, overdue: overdueTasks },
    resources: { added: resourcesAdded },
    studentTests: { attempts: attempts.length, passed: attempts.filter((a) => a.passed).length },
    newEducators,
  }
}

export function renderDigestEmailHtml(data: DigestData, reportUrl: string): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  const medal = ['🥇', '🥈', '🥉', '4.', '5.']
  const educatorRows = data.topEducators.length
    ? data.topEducators.map((e, i) => `
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#033D4C;font-weight:600">${medal[i]} ${e.name}</td>
          <td style="padding:10px 0;font-size:13px;color:#666">${e.branch ?? ''}</td>
          <td style="padding:10px 0;font-size:13px;color:#225632;font-weight:600;text-align:right">${e.total} activities</td>
        </tr>`).join('')
    : `<tr><td style="padding:10px 0;font-size:13px;color:#999">No task/stage completions logged this week.</td></tr>`

  return `
  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff">
    <h1 style="color:#033D4C;font-size:20px;margin-bottom:4px">RYSEN Weekly Digest</h1>
    <p style="color:#666;font-size:13px;margin-top:0">${fmt(data.weekStart)} — ${fmt(data.weekEnd)}</p>

    <h2 style="color:#033D4C;font-size:15px;border-bottom:2px solid #FECB08;padding-bottom:6px;margin-top:28px">🏆 Top Educators of the Week</h2>
    <table style="width:100%;border-collapse:collapse">${educatorRows}</table>

    <h2 style="color:#033D4C;font-size:15px;border-bottom:2px solid #FECB08;padding-bottom:6px;margin-top:28px">✦ Task Activity</h2>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:6px 0;font-size:14px;color:#333">Tasks created</td><td style="text-align:right;font-weight:600;color:#033D4C">${data.tasks.created}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#333">Tasks completed</td><td style="text-align:right;font-weight:600;color:#225632">${data.tasks.completed}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#333">Overdue (still pending)</td><td style="text-align:right;font-weight:600;color:#9E4A3A">${data.tasks.overdue}</td></tr>
    </table>

    <h2 style="color:#033D4C;font-size:15px;border-bottom:2px solid #FECB08;padding-bottom:6px;margin-top:28px">📚 Resources & Students</h2>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:6px 0;font-size:14px;color:#333">New resources added</td><td style="text-align:right;font-weight:600;color:#033D4C">${data.resources.added}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#333">Student test attempts</td><td style="text-align:right;font-weight:600;color:#033D4C">${data.studentTests.attempts}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#333">Passed</td><td style="text-align:right;font-weight:600;color:#225632">${data.studentTests.passed}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#333">New educators onboarded</td><td style="text-align:right;font-weight:600;color:#033D4C">${data.newEducators}</td></tr>
    </table>

    <a href="${reportUrl}" style="display:inline-block;margin-top:28px;background:#033D4C;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View Full Report →</a>
    <p style="color:#999;font-size:11px;margin-top:24px">Sent automatically every week by RYSEN Learning Centre.</p>
  </div>`
}
