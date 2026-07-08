export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const task = await db.task.findUnique({
    where: { id },
    include: {
      group: { select: { id: true, title: true, color: true } },
      subtasks: { orderBy: { order: 'asc' } },
      resources: true,
      comments: { include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'asc' } },
      assignments: {
        include: {
          user: { select: { id: true, name: true, branch: { select: { name: true } } } },
          progress: { include: { subtask: { select: { id: true, title: true } } } },
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
  })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Educators can only view if assigned
  if (user.role === Role.EDUCATOR || user.role === Role.PRINCIPAL) {
    const assigned = task.assignments.some((a) => a.userId === user.id)
    if (!assigned) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  return NextResponse.json(task)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id } = await params
  const body = await req.json()
  const task = await db.task.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.deadline !== undefined && { deadline: body.deadline ? new Date(body.deadline) : null }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.groupId !== undefined && { groupId: body.groupId || null }),
    },
  })
  return NextResponse.json(task)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id } = await params
  await db.task.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
