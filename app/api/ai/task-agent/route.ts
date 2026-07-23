export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'
import Groq from 'groq-sdk'

// ── Tool definitions ──────────────────────────────────────────────────────────
const TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'list_tasks',
      description: 'List all tasks, optionally filtered by group',
      parameters: {
        type: 'object',
        properties: {
          groupId: { type: 'string', description: 'Filter by task group ID (optional)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_task_groups',
      description: 'List all task groups',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_educators',
      description: 'List all educators with their branch info',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Search by name or branch (optional)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_task',
      description: 'Get full details of a specific task by ID',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Task ID' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a new task in the task directory',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'Task description (optional)' },
          notes: { type: 'string', description: 'Admin notes for educators (optional)' },
          priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH'], description: 'Priority level' },
          deadline: { type: 'string', description: 'Deadline as ISO date string e.g. 2026-08-01 (optional)' },
          groupId: { type: 'string', description: 'Task group ID (optional)' },
          assigneeIds: { type: 'array', items: { type: 'string' }, description: 'List of educator user IDs to assign (optional)' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: 'Update an existing task fields',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Task ID to update' },
          title: { type: 'string', description: 'New title (optional)' },
          description: { type: 'string', description: 'New description (optional)' },
          notes: { type: 'string', description: 'New admin notes (optional)' },
          priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH'], description: 'New priority (optional)' },
          deadline: { type: 'string', description: 'New deadline ISO date or null to clear (optional)' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_task',
      description: 'Permanently delete a task',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Task ID to delete' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'assign_educators',
      description: 'Assign or update educator assignments for a task',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Task ID' },
          userIds: { type: 'array', items: { type: 'string' }, description: 'Array of educator user IDs (replaces existing assignments)' },
        },
        required: ['taskId', 'userIds'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_subtask',
      description: 'Add a subtask/checklist item to a task',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Parent task ID' },
          title: { type: 'string', description: 'Subtask title' },
          deadline: { type: 'string', description: 'Subtask deadline ISO date (optional)' },
        },
        required: ['taskId', 'title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_resource',
      description: 'Add a resource (URL or document) to a task',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Parent task ID' },
          type: { type: 'string', enum: ['URL', 'DOCUMENT'], description: 'Resource type' },
          title: { type: 'string', description: 'Resource title' },
          url: { type: 'string', description: 'Resource URL' },
          description: { type: 'string', description: 'Key points about this resource (optional)' },
        },
        required: ['taskId', 'title', 'url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task_group',
      description: 'Create a new task group/category',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Group name' },
          description: { type: 'string', description: 'Group description (optional)' },
          color: { type: 'string', description: 'Hex color code e.g. #033D4C (optional)' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_educator_groups',
      description: 'List all saved educator groups with their members. Use this to assign a whole group to a task instead of individual educators.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'assign_group_to_task',
      description: 'Assign all members of a saved educator group to a task in one step',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Task ID to assign the group to' },
          groupId: { type: 'string', description: 'Educator group ID' },
        },
        required: ['taskId', 'groupId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_branches',
      description: 'List all campuses/branches with educator counts. Use this to find branch IDs before filtering educators by campus.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_reminder',
      description: 'Send email and/or WhatsApp reminder for a task to specific educators or all assignees',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Task ID to send reminder for' },
          userIds: { type: 'array', items: { type: 'string' }, description: 'Educator IDs to remind. If omitted, reminds all assignees.' },
          channels: { type: 'array', items: { type: 'string', enum: ['email', 'whatsapp'] }, description: 'Channels to use. Default: ["email"]' },
          message: { type: 'string', description: 'Custom message to include (optional — uses default task reminder if omitted)' },
        },
        required: ['taskId'],
      },
    },
  },
]

// ── Tool executors ────────────────────────────────────────────────────────────
async function executeTool(name: string, args: Record<string, unknown>, userId: string): Promise<unknown> {
  switch (name) {
    case 'list_tasks': {
      const groupId = args.groupId as string | undefined
      const tasks = await db.task.findMany({
        where: groupId ? { groupId } : {},
        include: {
          group: { select: { title: true, color: true } },
          assignments: { include: { user: { select: { name: true } } } },
          _count: { select: { subtasks: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      return tasks.map((t) => ({
        id: t.id, title: t.title, priority: t.priority,
        deadline: t.deadline, group: t.group?.title,
        assignees: t.assignments.map((a) => a.user.name),
        subtasks: t._count.subtasks, comments: t._count.comments,
      }))
    }
    case 'list_task_groups': {
      const groups = await db.taskGroup.findMany({ include: { _count: { select: { tasks: true } } }, orderBy: { createdAt: 'asc' } })
      return groups.map((g) => ({ id: g.id, title: g.title, description: g.description, tasks: g._count.tasks }))
    }
    case 'list_educators': {
      const search = (args.search as string | undefined)?.toLowerCase()
      const educators = await db.user.findMany({
        where: { role: { in: [Role.EDUCATOR, Role.PRINCIPAL] }, isActive: true },
        select: { id: true, name: true, email: true, branch: { select: { name: true } } },
        orderBy: { name: 'asc' },
      })
      const filtered = search
        ? educators.filter((e) => e.name.toLowerCase().includes(search) || (e.branch?.name ?? '').toLowerCase().includes(search))
        : educators
      return filtered.map((e) => ({ id: e.id, name: e.name, branch: e.branch?.name }))
    }
    case 'get_task': {
      const task = await db.task.findUnique({
        where: { id: args.id as string },
        include: {
          group: { select: { title: true } },
          subtasks: { orderBy: { order: 'asc' } },
          resources: true,
          assignments: { include: { user: { select: { name: true } }, progress: { select: { completed: true } } } },
          _count: { select: { comments: true } },
        },
      })
      if (!task) return { error: 'Task not found' }
      return {
        id: task.id, title: task.title, description: task.description, notes: task.notes,
        priority: task.priority, deadline: task.deadline, group: task.group?.title,
        subtasks: task.subtasks.map((s) => ({ id: s.id, title: s.title, deadline: s.deadline })),
        resources: task.resources.map((r) => ({ id: r.id, title: r.title, type: r.type, url: r.url })),
        assignees: task.assignments.map((a) => ({ name: a.user.name, completed: !!a.completedAt, subtasksDone: a.progress.filter((p) => p.completed).length })),
        comments: task._count.comments,
      }
    }
    case 'create_task': {
      const { title, description, notes, priority, deadline, groupId, assigneeIds } = args as {
        title: string; description?: string; notes?: string; priority?: string
        deadline?: string; groupId?: string; assigneeIds?: string[]
      }
      const task = await db.task.create({
        data: {
          title, description: description ?? null, notes: notes ?? null,
          priority: priority ?? 'NORMAL', deadline: deadline ? new Date(deadline) : null,
          groupId: groupId || null, createdById: userId,
          assignments: assigneeIds?.length ? { create: assigneeIds.map((uid) => ({ userId: uid })) } : undefined,
        },
      })
      if (assigneeIds?.length) {
        await db.notification.createMany({
          data: assigneeIds.map((uid) => ({ userId: uid, title: 'New Task Assigned', message: `You have been assigned: "${title}"`, type: 'TASK', relatedId: task.id })),
        })
      }
      return { success: true, id: task.id, title: task.title, message: `Task "${title}" created successfully${assigneeIds?.length ? ` and assigned to ${assigneeIds.length} educator(s)` : ''}.` }
    }
    case 'update_task': {
      const { id, title, description, notes, priority, deadline } = args as { id: string; title?: string; description?: string; notes?: string; priority?: string; deadline?: string | null }
      const task = await db.task.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(notes !== undefined && { notes }),
          ...(priority !== undefined && { priority }),
          ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        },
      })
      return { success: true, id: task.id, title: task.title, message: `Task "${task.title}" updated successfully.` }
    }
    case 'delete_task': {
      const task = await db.task.findUnique({ where: { id: args.id as string }, select: { title: true } })
      if (!task) return { error: 'Task not found' }
      await db.task.delete({ where: { id: args.id as string } })
      return { success: true, message: `Task "${task.title}" deleted successfully.` }
    }
    case 'assign_educators': {
      const { taskId, userIds } = args as { taskId: string; userIds: string[] }
      const existing = await db.taskAssignment.findMany({ where: { taskId }, select: { userId: true } })
      const existingIds = new Set(existing.map((a) => a.userId))
      const toAdd = userIds.filter((id) => !existingIds.has(id))
      const toRemove = [...existingIds].filter((id) => !userIds.includes(id))
      if (toRemove.length) await db.taskAssignment.deleteMany({ where: { taskId, userId: { in: toRemove } } })
      if (toAdd.length) {
        await db.taskAssignment.createMany({ data: toAdd.map((uid) => ({ taskId, userId: uid })) })
        const task = await db.task.findUnique({ where: { id: taskId }, select: { title: true } })
        await db.notification.createMany({ data: toAdd.map((uid) => ({ userId: uid, title: 'New Task Assigned', message: `You have been assigned: "${task?.title}"`, type: 'TASK', relatedId: taskId })) })
      }
      return { success: true, message: `Assignments updated: ${toAdd.length} added, ${toRemove.length} removed.` }
    }
    case 'add_subtask': {
      const { taskId, title, deadline } = args as { taskId: string; title: string; deadline?: string }
      const max = await db.subTask.aggregate({ where: { taskId }, _max: { order: true } })
      const sub = await db.subTask.create({ data: { taskId, title, deadline: deadline ? new Date(deadline) : null, order: (max._max.order ?? 0) + 1 } })
      return { success: true, id: sub.id, title: sub.title, message: `Subtask "${title}" added.` }
    }
    case 'add_resource': {
      const { taskId, type, title, url, description } = args as { taskId: string; type?: string; title: string; url: string; description?: string }
      const res = await db.taskResource.create({ data: { taskId, type: type ?? 'URL', title, url, description: description ?? null } })
      return { success: true, id: res.id, title: res.title, message: `Resource "${title}" added.` }
    }
    case 'create_task_group': {
      const { title, description, color } = args as { title: string; description?: string; color?: string }
      const COLORS = ['#033D4C', '#225632', '#7D783E', '#40403E', '#5B4D8A', '#9E4A3A', '#FECB08']
      const group = await db.taskGroup.create({ data: { title, description: description ?? null, color: color ?? COLORS[Math.floor(Math.random() * COLORS.length)], createdById: userId } })
      return { success: true, id: group.id, title: group.title, message: `Task group "${title}" created.` }
    }
    case 'list_educator_groups': {
      const groups = await db.educatorGroup.findMany({
        include: { members: { include: { user: { select: { id: true, name: true, branch: { select: { name: true } } } } } } },
        orderBy: { createdAt: 'asc' },
      })
      return groups.map((g) => ({
        id: g.id, name: g.name, description: g.description,
        memberCount: g.members.length,
        members: g.members.map((m) => ({ id: m.user.id, name: m.user.name, branch: m.user.branch?.name })),
      }))
    }
    case 'assign_group_to_task': {
      const { taskId, groupId } = args as { taskId: string; groupId: string }
      const group = await db.educatorGroup.findUnique({
        where: { id: groupId },
        include: { members: { select: { userId: true } } },
      })
      if (!group) return { error: 'Educator group not found' }
      const task = await db.task.findUnique({ where: { id: taskId }, select: { title: true } })
      if (!task) return { error: 'Task not found' }
      const existing = await db.taskAssignment.findMany({ where: { taskId }, select: { userId: true } })
      const existingIds = new Set(existing.map((a) => a.userId))
      const toAdd = group.members.map((m) => m.userId).filter((id) => !existingIds.has(id))
      if (toAdd.length > 0) {
        await db.taskAssignment.createMany({ data: toAdd.map((uid) => ({ taskId, userId: uid })) })
        await db.notification.createMany({
          data: toAdd.map((uid) => ({ userId: uid, title: 'New Task Assigned', message: `You have been assigned: "${task.title}"`, type: 'TASK', relatedId: taskId })),
        })
      }
      return { success: true, message: `Assigned "${group.name}" (${group.members.length} educators) to "${task.title}". ${toAdd.length} new, ${group.members.length - toAdd.length} already assigned.` }
    }
    case 'list_branches': {
      const branches = await db.branch.findMany({
        include: { _count: { select: { users: true } } },
        orderBy: { location: 'asc' },
      })
      return branches.map((b) => ({ id: b.id, name: b.name, location: b.location, educators: b._count.users }))
    }
    case 'send_reminder': {
      const { taskId, userIds, channels, message } = args as { taskId: string; userIds?: string[]; channels?: string[]; message?: string }
      const task = await db.task.findUnique({
        where: { id: taskId },
        include: { assignments: { select: { userId: true } } },
      })
      if (!task) return { error: 'Task not found' }
      const targetIds = userIds?.length ? userIds : task.assignments.map((a) => a.userId)
      if (!targetIds.length) return { error: 'No educators assigned to this task. Assign educators first.' }
      const educators = await db.user.findMany({
        where: { id: { in: targetIds } },
        select: { id: true, name: true, email: true, phone: true },
      })
      const useChannels = (channels?.length ? channels : ['email']) as ('email' | 'whatsapp')[]
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${process.env.VERCEL_URL ?? 'rysen-learning-centre.vercel.app'}`
      const taskUrl = `${appUrl}/educator/tasks/${taskId}`
      const deadlineStr = task.deadline
        ? new Date(task.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
        : 'No deadline'
      const results: string[] = []
      for (const edu of educators) {
        const body = message
          ? `${message}\n\nTask: ${task.title}\nView: ${taskUrl}`
          : `Hi ${edu.name}, reminder for task:\n\n*${task.title}*\nDeadline: ${deadlineStr}\n\nView: ${taskUrl}`
        // Email
        if (useChannels.includes('email') && edu.email) {
          try {
            const resendKey = process.env.RESEND_API_KEY
            if (resendKey) {
              const { Resend } = await import('resend')
              const resend = new Resend(resendKey)
              await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
                to: edu.email,
                subject: `Reminder: ${task.title}`,
                html: `<div style="font-family:sans-serif;padding:20px"><h2 style="color:#033D4C">RYSEN Task Reminder</h2><p>Hi <b>${edu.name}</b>,</p><p>${message ?? `Please complete your task before ${deadlineStr}.`}</p><h3>${task.title}</h3><a href="${taskUrl}" style="background:#033D4C;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:12px">View Task →</a></div>`,
              })
              results.push(`✓ Email → ${edu.name}`)
            }
          } catch { results.push(`✗ Email failed → ${edu.name}`) }
        }
        // WhatsApp
        if (useChannels.includes('whatsapp') && edu.phone) {
          const rawPhone = edu.phone.replace(/\D/g, '')
          const e164 = rawPhone.startsWith('91') && rawPhone.length === 12 ? `+${rawPhone}` : `+91${rawPhone}`
          try {
            const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN, from = process.env.TWILIO_WHATSAPP_FROM
            if (sid && token && from) {
              const twilio = (await import('twilio')).default
              await twilio(sid, token).messages.create({ from, to: `whatsapp:${e164}`, body })
              results.push(`✓ WhatsApp → ${edu.name}`)
            } else {
              results.push(`⚠ WhatsApp not configured (Twilio env vars missing) → ${edu.name}`)
            }
          } catch { results.push(`✗ WhatsApp failed → ${edu.name}`) }
        }
        await db.notification.create({
          data: { userId: edu.id, title: `Task Reminder: ${task.title}`, message: message ?? `Reminder to complete "${task.title}" by ${deadlineStr}.`, type: 'TASK', relatedId: taskId },
        })
      }
      return { success: true, message: `Reminders sent to ${educators.length} educator(s).`, details: results }
    }
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return NextResponse.json({ reply: 'AI not configured. Set GROQ_API_KEY.', actions: [] })

  const { messages } = await req.json() as { messages: Groq.Chat.Completions.ChatCompletionMessageParam[] }

  const groq = new Groq({ apiKey })
  const systemPrompt = `You are RYSEN AI — the intelligent task management assistant for RYSEN Learning Centre admin team.

Today: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}

CAPABILITIES (use tools proactively — chain multiple tools in one response):
- Create full tasks: title, description, notes, priority (LOW/NORMAL/HIGH), deadline, group
- Add subtasks with individual deadlines
- Add resources (URLs, Google Drive, Sheets, Docs, Videos) to tasks
- Assign educators: by name, by campus/branch, or all educators
- Send email + WhatsApp reminders for any task
- Update or delete tasks
- List tasks, groups, educators, branches

WORKFLOW RULES:
- CRITICAL: Call ONE tool per step. NEVER call create_task and add_resource or add_subtask in the same step. Wait for create_task to return the real task ID, then use that ID in the next step.
- Correct order: create_task → (get real ID from result) → add_subtask (using real ID) → add_resource (using real ID) → list_educators/list_educator_groups → assign → done
- Deadlines: convert natural language to ISO dates. "next Friday" = calculate from today. "end of month" = last day of current month. "in 3 days" = today + 3
- Educator groups: ALWAYS call list_educator_groups first. If a group matches what the user wants, use assign_group_to_task instead of manually listing and assigning educators
- When assigning by campus/branch ("all Ganganagar educators"), call list_branches first to get branch name, then list_educators with that branch as search term, then assign_educators
- When sending reminders, default channel is email. Add whatsapp if user mentions it
- Be brief in responses — show what was done, not what you're about to do
- Never ask for confirmation unless deleting. Just act.

EXAMPLE FLOWS the user might say:
"Create a STEM data sheet task for all Ganganagar educators due next Friday with HIGH priority and add the drive link"
→ create_task → add_resource → list_branches → list_educators(search=Ganganagar) → assign_educators → done

"Remind all educators about the orientation task via WhatsApp"
→ list_tasks → send_reminder(channels=[email,whatsapp]) → done

"Create a full onboarding task with 3 subtasks, assign everyone, set deadline end of month"
→ create_task → add_subtask × 3 → list_educators → assign_educators → done`

  const msgHistory: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  const actions: { tool: string; args: Record<string, unknown>; result: unknown }[] = []

  try {
    // Agentic loop — run until no more tool calls
    for (let i = 0; i < 8; i++) {
      let response: Awaited<ReturnType<typeof groq.chat.completions.create>>
      try {
        response = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: msgHistory,
          tools: TOOLS,
          tool_choice: 'auto',
          max_tokens: 2000,
        })
      } catch (groqErr) {
        // Groq rejects its own hallucinated tool names (e.g. "list_task_groups?") — retry without tools
        const errMsg = groqErr instanceof Error ? groqErr.message : String(groqErr)
        if (errMsg.includes('tool_use_failed') || errMsg.includes('tool call validation')) {
          response = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: msgHistory,
            max_tokens: 2000,
          })
        } else {
          throw groqErr
        }
      }

      const msg = response.choices[0].message
      msgHistory.push(msg as Groq.Chat.Completions.ChatCompletionMessageParam)

      if (!msg.tool_calls?.length) {
        return NextResponse.json({ reply: msg.content ?? 'Done.', actions })
      }

      // Execute tool calls one at a time — feed each result back before running next
      // This prevents create_task + add_resource batching (FK errors from predicted IDs)
      const toolResults: Groq.Chat.Completions.ChatCompletionToolMessageParam[] = []
      for (const call of msg.tool_calls) {
        try {
          const toolName = call.function.name.replace(/[^a-z0-9_]/gi, '')
          const args = (JSON.parse(call.function.arguments) ?? {}) as Record<string, unknown>
          const result = await executeTool(toolName, args, user.id)
          actions.push({ tool: toolName, args, result })
          toolResults.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) })
        } catch (toolErr) {
          const errResult = { error: String(toolErr) }
          actions.push({ tool: call.function.name.replace(/[^a-z0-9_]/gi, ''), args: {}, result: errResult })
          toolResults.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(errResult) })
        }
      }
      msgHistory.push(...toolResults)
    }

    return NextResponse.json({ reply: 'Done processing your request.', actions })
  } catch (err) {
    console.error('[RYSEN AI]', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ reply: `AI error: ${msg}`, actions })
  }
}
