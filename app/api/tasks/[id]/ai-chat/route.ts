export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Groq from 'groq-sdk'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const task = await db.task.findUnique({
    where: { id },
    include: {
      subtasks: { orderBy: { order: 'asc' } },
      resources: true,
      group: { select: { title: true } },
    },
  })
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return NextResponse.json({ reply: 'AI assistant not configured. Ask your admin.' })

  const context = `
TASK: ${task.title}
GROUP: ${task.group?.title ?? 'None'}
DESCRIPTION: ${task.description ?? 'None'}
NOTES FROM ADMIN: ${task.notes ?? 'None'}
PRIORITY: ${task.priority}
DEADLINE: ${task.deadline ? new Date(task.deadline).toLocaleDateString('en-IN') : 'No deadline'}

SUBTASKS:
${task.subtasks.length ? task.subtasks.map((s, i) => `${i + 1}. ${s.title}${s.deadline ? ` (due: ${new Date(s.deadline).toLocaleDateString('en-IN')})` : ''}`).join('\n') : 'No subtasks'}

RESOURCES:
${task.resources.length ? task.resources.map((r) => `- ${r.title} [${r.type}]: ${r.url}${r.description ? ` — ${r.description}` : ''}`).join('\n') : 'No resources'}
`

  const groq = new Groq({ apiKey })
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are a helpful task assistant for RYSEN Learning Centre educators. Answer questions about the assigned task using the context below. Be concise, practical, and encouraging. If the educator asks something unrelated to the task, gently redirect them to ask their admin.

TASK CONTEXT:
${context}`,
      },
      { role: 'user', content: message },
    ],
    max_tokens: 600,
  })

  const reply = completion.choices[0]?.message?.content ?? 'Sorry, I could not generate a response. Please try again.'
  return NextResponse.json({ reply })
}
