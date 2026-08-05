export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') // 'all' | 'completed' | 'pending'
    const limit = parseInt(searchParams.get('limit') ?? '100')

    const tasks = await db.task.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, title: true, color: true } },
        subtasks: { select: { id: true, title: true, deadline: true, order: true } },
        assignments: {
          include: {
            user: { select: { id: true, name: true, email: true, branch: { select: { name: true } } } },
            progress: {
              include: { subtask: { select: { id: true, title: true } } },
            },
          },
        },
      },
    })

    const history = tasks.map((t) => {
      const totalAssignees = t.assignments.length
      const completedAssignees = t.assignments.filter((a) => a.completedAt !== null).length
      const pendingAssignees = totalAssignees - completedAssignees

      const assigneeDetails = t.assignments.map((a) => {
        const totalSubtasks = t.subtasks.length
        const completedSubtasks = a.progress.filter((p) => p.completed).length
        const lastActivity = a.progress
          .filter((p) => p.completedAt)
          .sort((x, y) => new Date(y.completedAt!).getTime() - new Date(x.completedAt!).getTime())[0]?.completedAt ?? null

        return {
          userId: a.user.id,
          name: a.user.name,
          email: a.user.email,
          branch: a.user.branch?.name ?? null,
          assignedAt: a.createdAt,
          completedAt: a.completedAt,
          status: a.completedAt ? 'completed' : totalSubtasks > 0 && completedSubtasks > 0 ? 'in_progress' : 'pending',
          subtasksCompleted: completedSubtasks,
          subtasksTotal: totalSubtasks,
          lastActivity,
        }
      }).sort((a, b) => {
        // completed last, then by name
        if (a.completedAt && !b.completedAt) return 1
        if (!a.completedAt && b.completedAt) return -1
        return a.name.localeCompare(b.name)
      })

      return {
        id: t.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        deadline: t.deadline,
        createdAt: t.createdAt,
        createdBy: t.createdBy,
        group: t.group,
        subtasks: t.subtasks.sort((a, b) => a.order - b.order),
        totalAssignees,
        completedAssignees,
        pendingAssignees,
        completionRate: totalAssignees > 0 ? Math.round((completedAssignees / totalAssignees) * 100) : 0,
        assignees: assigneeDetails,
        overallStatus: totalAssignees === 0 ? 'unassigned'
          : completedAssignees === totalAssignees ? 'completed'
          : completedAssignees > 0 ? 'in_progress'
          : 'pending',
      }
    }).filter((t) => {
      if (status === 'completed') return t.overallStatus === 'completed'
      if (status === 'pending') return t.overallStatus === 'pending' || t.overallStatus === 'in_progress'
      return true
    })

    return NextResponse.json({ tasks: history })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
