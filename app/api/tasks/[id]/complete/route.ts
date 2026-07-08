export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: taskId } = await params
  const { subtaskId, completed } = await req.json()

  const assignment = await db.taskAssignment.findUnique({ where: { taskId_userId: { taskId, userId: user.id } } })
  if (!assignment) return NextResponse.json({ error: 'Not assigned' }, { status: 403 })

  if (subtaskId !== undefined) {
    // Toggle subtask
    await db.subTaskProgress.upsert({
      where: { assignmentId_subtaskId: { assignmentId: assignment.id, subtaskId } },
      create: { assignmentId: assignment.id, subtaskId, completed, completedAt: completed ? new Date() : null },
      update: { completed, completedAt: completed ? new Date() : null },
    })
  } else {
    // Mark whole task complete/incomplete
    await db.taskAssignment.update({
      where: { id: assignment.id },
      data: { completedAt: completed ? new Date() : null },
    })
  }

  return NextResponse.json({ ok: true })
}
