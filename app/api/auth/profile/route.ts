export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [profile, assignments, stageResults] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        branch: { select: { id: true, name: true, location: true } },
        createdAt: true,
      },
    }),
    db.taskAssignment.findMany({
      where: { userId: user.id },
      include: {
        task: { select: { title: true, status: true } },
        progress: { select: { completed: true } },
      },
    }),
    db.stageResult.findMany({
      where: { userId: user.id },
      select: { passed: true, score: true, stageId: true },
    }),
  ])

  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const stagesPassed = stageResults.filter((r) => r.passed).length
  const totalStages = new Set(stageResults.map((r) => r.stageId)).size
  const avgScore = stageResults.length
    ? Math.round(stageResults.reduce((s, r) => s + r.score, 0) / stageResults.length)
    : 0

  const tasksTotal = assignments.length
  const tasksCompleted = assignments.filter((a) => {
    if (!a.task) return false
    const subtaskCount = a.progress.length
    const completedCount = a.progress.filter((p) => p.completed).length
    return subtaskCount > 0 ? completedCount === subtaskCount : a.task.status === 'COMPLETED'
  }).length

  return NextResponse.json({
    ...profile,
    stats: { stagesPassed, totalStages, avgScore, tasksTotal, tasksCompleted },
  })
}

export async function PUT(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { phone } = await req.json()
  const updated = await db.user.update({
    where: { id: user.id },
    data: { phone: phone?.trim() || null },
    select: { id: true, name: true, email: true, phone: true, role: true },
  })
  return NextResponse.json(updated)
}
