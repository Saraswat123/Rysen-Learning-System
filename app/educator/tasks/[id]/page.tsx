'use client'
import { useState, useEffect, use, useRef } from 'react'
import { ArrowLeft, Link2, FileText, CheckSquare, Square, MessageSquare, Send, CheckCircle, Calendar, AlertCircle, Clock, StickyNote, Bot, User } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'

interface SubTask { id: string; title: string; order: number; deadline: string | null }
interface Resource { id: string; type: string; title: string; url: string; description: string | null }
interface Comment { id: string; text: string; createdAt: string; user: { id: string; name: string; role: string } }
interface MyProgress { subtaskId: string; completed: boolean }
interface Task {
  id: string; title: string; description: string | null; notes: string | null; deadline: string | null; priority: string
  group: { title: string; color: string } | null; createdBy: { name: string }
  subtasks: SubTask[]; resources: Resource[]; comments: Comment[]
  assignments: { userId: string; completedAt: string | null; progress: MyProgress[] }[]
}
interface ChatMessage { role: 'user' | 'ai'; text: string }

const ROLE_BADGE: Record<string, string> = { ADMIN: 'text-gold', SUPER_ADMIN: 'text-gold', EDUCATOR: 'text-midnight/50', PRINCIPAL: 'text-forest' }

function deadlinePill(d: string | null, small = false) {
  if (!d) return null
  const diff = (new Date(d).getTime() - Date.now()) / 86400000
  const label = new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  const sz = small ? 10 : 11
  if (diff < 0) return <span className={`flex items-center gap-1 ${small ? 'text-[10px]' : 'text-xs'} text-red-500 font-semibold`}><AlertCircle size={sz} /> Overdue · {label}</span>
  if (diff < 2) return <span className={`flex items-center gap-1 ${small ? 'text-[10px]' : 'text-xs'} text-amber-500 font-semibold`}><Clock size={sz} /> Due soon · {label}</span>
  return <span className={`flex items-center gap-1 ${small ? 'text-[10px]' : 'text-xs'} text-charcoal/40`}><Calendar size={sz} /> {label}</span>
}

export default function EducatorTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [task, setTask] = useState<Task | null>(null)
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  async function load() {
    const [t, me] = await Promise.all([
      fetch(`/api/tasks/${id}`).then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.json()),
    ])
    if (t.id) setTask(t)
    if (me.user) setMyUserId(me.user.id)
    setLoading(false)
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  const myAssignment = task?.assignments.find((a) => a.userId === myUserId)
  const myProgress = myAssignment?.progress ?? []

  async function toggleSubtask(subtaskId: string, current: boolean) {
    setSaving(`sub-${subtaskId}`)
    await fetch(`/api/tasks/${id}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subtaskId, completed: !current }) })
    setSaving(null); load()
  }

  async function markTaskComplete(completed: boolean) {
    setSaving('task')
    await fetch(`/api/tasks/${id}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed }) })
    setSaving(null); load()
  }

  async function sendComment(e: React.FormEvent) {
    e.preventDefault(); if (!commentText.trim()) return
    setSaving('comment')
    await fetch(`/api/tasks/${id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: commentText }) })
    setCommentText(''); setSaving(null); load()
  }

  async function sendChat(e: React.FormEvent) {
    e.preventDefault(); if (!chatInput.trim() || chatLoading) return
    const msg = chatInput.trim()
    setChatMessages((prev) => [...prev, { role: 'user', text: msg }])
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await fetch(`/api/tasks/${id}/ai-chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }) })
      const data = await res.json()
      setChatMessages((prev) => [...prev, { role: 'ai', text: data.reply ?? 'No response.' }])
    } catch {
      setChatMessages((prev) => [...prev, { role: 'ai', text: 'Failed to get response. Please try again.' }])
    }
    setChatLoading(false)
  }

  if (loading) return <div className="flex justify-center py-24"><div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" /></div>
  if (!task) return <div className="text-center py-16 text-charcoal/40">Task not found.</div>

  const subtaskDone = myProgress.filter((p) => p.completed).length
  const subtaskTotal = task.subtasks.length
  const isCompleted = !!myAssignment?.completedAt
  const diff = task.deadline ? (new Date(task.deadline).getTime() - Date.now()) / 86400000 : null

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/educator/tasks" className="flex items-center gap-1.5 text-sm text-charcoal/50 hover:text-midnight mb-6 transition-colors">
        <ArrowLeft size={15} /> Back to Tasks
      </Link>

      {/* Header */}
      <div className={`rounded-2xl border p-6 mb-6 ${isCompleted ? 'bg-forest/5 border-forest/20' : 'bg-white border-gray-100'}`}>
        {task.group && <p className="text-xs font-semibold mb-1" style={{ color: task.group.color }}>{task.group.title}</p>}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className={`text-2xl font-bold ${isCompleted ? 'text-forest line-through opacity-70' : 'text-midnight'}`}>{task.title}</h1>
            {task.description && <p className="text-charcoal/60 mt-1 text-sm leading-relaxed">{task.description}</p>}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${task.priority === 'HIGH' ? 'bg-red-50 text-red-600' : task.priority === 'LOW' ? 'bg-gray-100 text-charcoal/50' : 'bg-midnight/5 text-midnight'}`}>{task.priority}</span>
              {deadlinePill(task.deadline)}
              <span className="text-xs text-charcoal/40">Assigned by {task.createdBy.name}</span>
            </div>
          </div>
          <div>
            {isCompleted
              ? <Button onClick={() => markTaskComplete(false)} loading={saving === 'task'} className="bg-white border border-forest text-forest hover:bg-forest/5 text-sm">Undo Complete</Button>
              : <Button onClick={() => markTaskComplete(true)} loading={saving === 'task'} className="bg-forest text-white hover:bg-forest/80 flex items-center gap-2 text-sm"><CheckCircle size={15} /> Mark Complete</Button>}
          </div>
        </div>
      </div>

      {/* Admin Notes */}
      {task.notes && (
        <div className="bg-gold/10 border border-gold/30 rounded-2xl p-5 mb-6">
          <h2 className="font-bold text-midnight mb-2 flex items-center gap-2"><StickyNote size={16} className="text-olive" /> Notes from Admin</h2>
          <p className="text-sm text-charcoal leading-relaxed whitespace-pre-line">{task.notes}</p>
        </div>
      )}

      {/* Subtask checklist */}
      {task.subtasks.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-midnight flex items-center gap-2"><CheckSquare size={16} /> Checklist</h2>
            <span className="text-sm text-charcoal/50 font-medium">{subtaskDone}/{subtaskTotal} done</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-midnight rounded-full transition-all" style={{ width: subtaskTotal > 0 ? `${Math.round((subtaskDone / subtaskTotal) * 100)}%` : '0%' }} />
          </div>
          <div className="flex flex-col gap-2">
            {task.subtasks.map((s) => {
              const prog = myProgress.find((p) => p.subtaskId === s.id)
              const done = prog?.completed ?? false
              return (
                <button key={s.id} onClick={() => toggleSubtask(s.id, done)} disabled={saving === `sub-${s.id}`}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${done ? 'border-forest/20 bg-forest/5' : 'border-gray-100 hover:border-midnight/20 hover:bg-midnight/5'}`}>
                  {done ? <CheckSquare size={17} className="text-forest flex-shrink-0" /> : <Square size={17} className="text-charcoal/30 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${done ? 'line-through text-forest/70' : 'text-midnight'}`}>{s.title}</span>
                    {deadlinePill(s.deadline, true)}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Resources */}
      {task.resources.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <h2 className="font-bold text-midnight mb-3 flex items-center gap-2"><Link2 size={16} /> Resources</h2>
          <div className="flex flex-col gap-2">
            {task.resources.map((r) => (
              <a key={r.id} href={r.url} target="_blank" rel="noreferrer"
                className="flex items-start gap-3 p-3 bg-midnight/5 rounded-xl hover:bg-midnight/10 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {r.type === 'URL' ? <Link2 size={16} className="text-midnight" /> : <FileText size={16} className="text-forest" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-midnight">{r.title}</p>
                  <p className="text-xs text-charcoal/50">{r.type}</p>
                  {r.description && <p className="text-xs text-charcoal/70 mt-1 italic">{r.description}</p>}
                </div>
                <span className="text-xs text-midnight font-semibold flex-shrink-0">Open →</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* AI Q&A Assistant */}
      <div className="bg-midnight rounded-2xl p-5 mb-6">
        <h2 className="font-bold text-white mb-1 flex items-center gap-2"><Bot size={16} className="text-gold" /> AI Task Assistant</h2>
        <p className="text-xs text-white/40 mb-4">Ask anything about this task — AI will answer using task context</p>
        <div className="flex flex-col gap-3 max-h-64 overflow-y-auto mb-3 pr-1">
          {chatMessages.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-white/30">Ask a question to get started…</p>
              <div className="flex flex-wrap gap-2 justify-center mt-3">
                {['How do I complete this task?', 'What are the key steps?', 'Explain the resources'].map((q) => (
                  <button key={q} onClick={() => setChatInput(q)}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {chatMessages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'ai' ? 'bg-gold' : 'bg-white/10'}`}>
                {m.role === 'ai' ? <Bot size={14} className="text-midnight" /> : <User size={14} className="text-white/70" />}
              </div>
              <div className={`max-w-xs rounded-xl px-3 py-2 text-sm leading-relaxed ${m.role === 'ai' ? 'bg-white/10 text-white' : 'bg-gold text-midnight font-medium'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gold flex items-center justify-center flex-shrink-0"><Bot size={14} className="text-midnight" /></div>
              <div className="bg-white/10 rounded-xl px-4 py-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={sendChat} className="flex gap-2">
          <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask about this task…"
            className="flex-1 px-3 py-2 bg-white/10 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-gold" />
          <button type="submit" disabled={chatLoading || !chatInput.trim()}
            className="px-4 py-2 bg-gold text-midnight rounded-xl font-semibold text-sm hover:bg-yellow-400 disabled:opacity-40 transition-colors flex-shrink-0">
            <Send size={14} />
          </button>
        </form>
      </div>

      {/* Comments */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-midnight mb-4 flex items-center gap-2"><MessageSquare size={16} /> Comments &amp; Doubts</h2>
        <div className="flex flex-col gap-3 mb-4 max-h-64 overflow-y-auto">
          {task.comments.map((c) => (
            <div key={c.id} className={`flex gap-3 ${c.user.id === myUserId ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-midnight flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {c.user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className={`flex-1 max-w-sm rounded-xl px-3 py-2 ${c.user.id === myUserId ? 'bg-midnight/5 text-right' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-xs font-semibold text-midnight">{c.user.name}</span>
                  <span className={`text-xs ${ROLE_BADGE[c.user.role] ?? 'text-charcoal/40'}`}>{c.user.role.replace('_', ' ')}</span>
                  <span className="text-xs text-charcoal/30 ml-auto">{new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                </div>
                <p className="text-sm text-charcoal leading-relaxed">{c.text}</p>
              </div>
            </div>
          ))}
          {task.comments.length === 0 && <p className="text-sm text-charcoal/40">No comments yet. Ask your doubt below.</p>}
        </div>
        <form onSubmit={sendComment} className="flex gap-2">
          <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Ask a doubt or leave a comment…"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight" />
          <Button type="submit" size="sm" loading={saving === 'comment'} className="flex items-center gap-1"><Send size={13} /> Send</Button>
        </form>
      </div>
    </div>
  )
}
