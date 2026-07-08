export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: taskId } = await params
  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'Comment required' }, { status: 400 })

  const comment = await db.taskComment.create({
    data: { taskId, userId: user.id, text: text.trim() },
    include: { user: { select: { id: true, name: true, role: true } } },
  })

  // Notify task creator if commenter is educator
  const task = await db.task.findUnique({ where: { id: taskId }, select: { createdById: true, title: true } })
  if (task && task.createdById !== user.id) {
    await db.notification.create({
      data: {
        userId: task.createdById,
        title: 'New Comment on Task',
        message: `${user.name} asked: "${text.trim().slice(0, 80)}"`,
        type: 'COMMENT',
        relatedId: taskId,
      },
    })
  }

  return NextResponse.json(comment, { status: 201 })
}
