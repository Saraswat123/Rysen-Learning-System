export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'
import Groq from 'groq-sdk'

// Educator-facing assistant — deliberately narrower than the admin RYSEN AI agent.
// Every tool is read-only (except mark_subtask_complete) and every query is scoped
// to the logged-in educator's own userId/branchId — the model is never given a
// userId parameter to pass in, so it can't be prompted into reading someone else's data.

const TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_my_tasks',
      description: "List the logged-in educator's assigned tasks with completion status",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_task_details',
      description: 'Get full details (subtasks, resources, notes, deadline) of one of the educator\'s own assigned tasks',
      parameters: {
        type: 'object',
        properties: { taskId: { type: 'string', description: 'Task ID' } },
        required: ['taskId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mark_subtask_complete',
      description: "Mark one of the educator's own subtasks as complete or incomplete",
      parameters: {
        type: 'object',
        properties: {
          subtaskId: { type: 'string' },
          completed: { type: 'boolean' },
        },
        required: ['subtaskId', 'completed'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_resources',
      description: 'List resources visible to this educator (pinned + group-scoped + branch-scoped)',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_student_tests',
      description: "List student tests visible at the educator's branch, with attempt/pass counts",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_student_progress_summary',
      description: 'Summary stats of how the branch\'s students are performing (avg score, at-risk count)',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_recognition',
      description: "Get the educator's own monthly recognition scores/rank if they're in any recognition category",
      parameters: { type: 'object', properties: {} },
    },
  },
]

async function executeTool(name: string, args: Record<string, unknown>, userId: string, branchId: string | null) {
  switch (name) {
    case 'get_my_tasks': {
      const assignments = await db.taskAssignment.findMany({
        where: { userId },
        include: {
          task: { select: { id: true, title: true, priority: true, deadline: true } },
          progress: { select: { completed: true } },
        },
        orderBy: { task: { deadline: 'asc' } },
      })
      return assignments.map((a) => ({
        taskId: a.task.id, title: a.task.title, priority: a.task.priority,
        deadline: a.task.deadline, completed: !!a.completedAt,
        subtasksDone: a.progress.filter((p) => p.completed).length, subtasksTotal: a.progress.length,
      }))
    }
    case 'get_task_details': {
      const { taskId } = args as { taskId: string }
      const assignment = await db.taskAssignment.findUnique({
        where: { taskId_userId: { taskId, userId } },
        include: {
          task: { include: { subtasks: true, resources: true } },
          progress: true,
        },
      })
      if (!assignment) return { error: 'Task not found or not assigned to you' }
      return {
        title: assignment.task.title, description: assignment.task.description, notes: assignment.task.notes,
        priority: assignment.task.priority, deadline: assignment.task.deadline,
        subtasks: assignment.task.subtasks.map((s) => ({
          id: s.id, title: s.title, deadline: s.deadline,
          completed: assignment.progress.find((p) => p.subtaskId === s.id)?.completed ?? false,
        })),
        resources: assignment.task.resources.map((r) => ({ title: r.title, url: r.url, type: r.type })),
      }
    }
    case 'mark_subtask_complete': {
      const { subtaskId, completed } = args as { subtaskId: string; completed: boolean }
      const subtask = await db.subTask.findUnique({ where: { id: subtaskId }, select: { taskId: true, title: true } })
      if (!subtask) return { error: 'Subtask not found' }
      const assignment = await db.taskAssignment.findUnique({ where: { taskId_userId: { taskId: subtask.taskId, userId } } })
      if (!assignment) return { error: 'This task is not assigned to you' }
      await db.subTaskProgress.upsert({
        where: { assignmentId_subtaskId: { assignmentId: assignment.id, subtaskId } },
        update: { completed, completedAt: completed ? new Date() : null },
        create: { assignmentId: assignment.id, subtaskId, completed, completedAt: completed ? new Date() : null },
      })
      return { success: true, message: `"${subtask.title}" marked ${completed ? 'complete' : 'incomplete'}.` }
    }
    case 'get_my_resources': {
      const memberships = await db.educatorGroupMember.findMany({ where: { userId }, select: { groupId: true } })
      const groupIds = memberships.map((m) => m.groupId)
      const resources = await db.resource.findMany({
        where: {
          isPublished: true,
          AND: [
            { OR: [{ branchId }, { branchId: null }] },
            { OR: [{ groupId: null }, { groupId: { in: groupIds } }] },
          ],
        },
        select: { title: true, description: true, type: true, category: true, url: true, isPinned: true },
        orderBy: { isPinned: 'desc' },
        take: 30,
      })
      return resources
    }
    case 'get_my_student_tests': {
      const tests = await db.studentTest.findMany({
        where: { OR: branchId ? [{ branchId }, { branchId: null }] : [{ branchId: null }] },
        include: { _count: { select: { attempts: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
      return tests.map((t) => ({
        title: t.title, subject: t.subject, targetClass: t.targetClass,
        published: t.isPublished, attempts: t._count.attempts,
      }))
    }
    case 'get_my_student_progress_summary': {
      const students = await db.student.findMany({
        where: { ...(branchId ? { branchId } : {}), isActive: true },
        include: { attempts: { select: { score: true, totalMarks: true, passed: true } } },
      })
      const allAttempts = students.flatMap((s) => s.attempts)
      const avgScore = allAttempts.length > 0
        ? Math.round(allAttempts.reduce((sum, a) => sum + (a.totalMarks > 0 ? (a.score / a.totalMarks) * 100 : 0), 0) / allAttempts.length)
        : null
      const atRisk = students.filter((s) => {
        if (s.attempts.length === 0) return true
        const passRate = s.attempts.filter((a) => a.passed).length / s.attempts.length
        return passRate < 0.4
      }).length
      return { totalStudents: students.length, avgScorePercent: avgScore, atRiskCount: atRisk, totalAttempts: allAttempts.length }
    }
    case 'get_my_recognition': {
      const myGroups = await db.educatorGroupMember.findMany({ where: { userId }, select: { groupId: true } })
      const categories = await db.recognitionCategory.findMany({
        where: { groupId: { in: myGroups.map((g) => g.groupId) } },
        select: { id: true, name: true },
      })
      if (categories.length === 0) return { message: 'Not part of any recognition category yet.' }
      const results = []
      for (const cat of categories) {
        const latest = await db.educatorRating.findFirst({
          where: { categoryId: cat.id, userId, finalized: true },
          orderBy: { period: 'desc' },
        })
        if (latest) {
          const scores = latest.scores as Record<string, number>
          const values = Object.values(scores)
          const avg = values.length > 0 ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null
          results.push({ category: cat.name, period: latest.period, average: avg })
        }
      }
      return results.length > 0 ? results : { message: 'No finalized recognition results yet.' }
    }
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || user.role !== Role.EDUCATOR) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return NextResponse.json({ reply: 'AI not configured. Contact your admin.', actions: [] })

  const { messages } = await req.json() as { messages: Groq.Chat.Completions.ChatCompletionMessageParam[] }

  const groq = new Groq({ apiKey })
  const systemPrompt = `You are RYSEN AI — the assistant for RYSEN Learning Centre educators.

Today: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
Educator: ${user.name}${user.branch ? ` · ${user.branch.name}` : ''}

WHAT YOU CAN DO:
- Summarize the educator's assigned tasks and their progress
- Explain a specific task in detail (subtasks, deadline, resources, admin notes)
- Mark a subtask complete/incomplete when asked
- List resources shared with this educator
- List student tests at their campus and how students are doing
- Summarize student performance (avg score, at-risk students)
- Report the educator's own monthly recognition score/rank if applicable

PLATFORM GUIDANCE (answer these from knowledge, no tool needed):
- To create a student test: Students → Student Tests → Create Test → add MCQ questions with 4 options each → Publish
- To conduct a test smoothly: publish it in advance, confirm target class matches, tell students the pass score, and check "Class Analytics" after for a score-distribution heatmap
- To add a student: Students → Add Student (or bulk import a CSV for many at once)
- To message the whole group: My Groups → pick the group → chat tab
- Recognition scores are entered monthly by admin and appear once finalized — visible under Achievements → Recognition

RULES:
- Use tools proactively when the question needs live data — don't guess numbers
- Keep answers short and direct, formatted for a busy teacher reading on a phone
- Never claim you changed something you didn't call a tool for
- If asked about another educator's data, explain you can only see the asking educator's own information`

  const msgHistory: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  const actions: { tool: string; args: Record<string, unknown>; result: unknown }[] = []

  try {
    for (let i = 0; i < 6; i++) {
      let response: Awaited<ReturnType<typeof groq.chat.completions.create>>
      try {
        response = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: msgHistory,
          tools: TOOLS,
          tool_choice: 'auto',
          max_tokens: 1200,
        })
      } catch (groqErr) {
        const errMsg = groqErr instanceof Error ? groqErr.message : String(groqErr)
        if (errMsg.includes('tool_use_failed') || errMsg.includes('tool call validation')) {
          response = await groq.chat.completions.create({ model: 'llama-3.3-70b-versatile', messages: msgHistory, max_tokens: 1200 })
        } else {
          throw groqErr
        }
      }

      const msg = response.choices[0].message
      msgHistory.push(msg as Groq.Chat.Completions.ChatCompletionMessageParam)

      if (!msg.tool_calls?.length) {
        return NextResponse.json({ reply: msg.content ?? 'Done.', actions })
      }

      const toolResults: Groq.Chat.Completions.ChatCompletionToolMessageParam[] = []
      for (const call of msg.tool_calls) {
        try {
          const toolName = call.function.name.replace(/[^a-z0-9_]/gi, '')
          const args = (JSON.parse(call.function.arguments) ?? {}) as Record<string, unknown>
          const result = await executeTool(toolName, args, user.id, user.branchId ?? null)
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

    return NextResponse.json({ reply: 'Done.', actions })
  } catch (err) {
    console.error('[RYSEN AI educator]', err)
    return NextResponse.json({ reply: `AI error: ${err instanceof Error ? err.message : String(err)}`, actions })
  }
}
