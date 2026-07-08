export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

// POST: assign/unassign educators to task
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id: taskId } = await params
  const { userIds } = await req.json() // full desired set of assignees

  const task = await db.task.findUnique({ where: { id: taskId }, select: { title: true } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const existing = await db.taskAssignment.findMany({ where: { taskId }, select: { userId: true } })
  const existingIds = new Set(existing.map((a) => a.userId))
  const desiredIds = new Set(userIds as string[])

  const toAdd = [...desiredIds].filter((id) => !existingIds.has(id))
  const toRemove = [...existingIds].filter((id) => !desiredIds.has(id))

  if (toAdd.length) {
    await db.taskAssignment.createMany({ data: toAdd.map((uid) => ({ taskId, userId: uid })) })
    await db.notification.createMany({
      data: toAdd.map((uid) => ({
        userId: uid,
        title: 'New Task Assigned',
        message: `You have been assigned: "${task.title}"`,
        type: 'TASK',
        relatedId: taskId,
      })),
    })
  }
  if (toRemove.length) {
    await db.taskAssignment.deleteMany({ where: { taskId, userId: { in: toRemove } } })
  }

  const updated = await db.taskAssignment.findMany({
    where: { taskId },
    include: { user: { select: { id: true, name: true, branch: { select: { name: true } } } } },
  })
  return NextResponse.json(updated)
}
