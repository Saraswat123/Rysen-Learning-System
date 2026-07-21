export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const groupId = searchParams.get('groupId') || undefined

  // Educators see only assigned tasks
  if (user.role === Role.EDUCATOR || user.role === Role.PRINCIPAL) {
    const assignments = await db.taskAssignment.findMany({
      where: { userId: user.id },
      include: {
        task: {
          include: {
            group: { select: { id: true, title: true, color: true } },
            subtasks: { orderBy: { order: 'asc' } },
            resources: true,
            _count: { select: { comments: true } },
          },
        },
        progress: { select: { completed: true, subtaskId: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(assignments)
  }

  // Admin sees own tasks + all ALL_ADMINS tasks
  const tasks = await db.task.findMany({
    where: {
      ...(groupId ? { groupId } : {}),
      OR: [{ createdById: user.id }, { visibility: 'ALL_ADMINS' }],
    },
    include: {
      group: { select: { id: true, title: true, color: true } },
      subtasks: { orderBy: { order: 'asc' } },
      resources: true,
      _count: { select: { assignments: true, comments: true } },
      assignments: { include: { user: { select: { id: true, name: true, branch: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const body = await req.json()
  const { title, description, deadline, priority, groupId, assigneeIds, visibility } = body
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const task = await db.task.create({
    data: {
      title,
      description: description ?? null,
      deadline: deadline ? new Date(deadline) : null,
      priority: priority ?? 'NORMAL',
      visibility: visibility ?? 'ALL_ADMINS',
      groupId: groupId || null,
      createdById: user.id,
      assignments: assigneeIds?.length
        ? { create: assigneeIds.map((uid: string) => ({ userId: uid })) }
        : undefined,
    },
    include: { assignments: { include: { user: { select: { id: true, name: true } } } } },
  })

  // Create notifications for assignees
  if (assigneeIds?.length) {
    await db.notification.createMany({
      data: assigneeIds.map((uid: string) => ({
        userId: uid,
        title: 'New Task Assigned',
        message: `You have been assigned: "${title}"`,
        type: 'TASK',
        relatedId: task.id,
      })),
    })
  }

  return NextResponse.json(task, { status: 201 })
}
