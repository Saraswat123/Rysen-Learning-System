'use client'
import { useState, useEffect, use, useRef } from 'react'
import { ArrowLeft, Plus, Trash2, Link2, FileText, Users, CheckSquare, Square, Calendar, MessageSquare, Send, X, CheckCircle, StickyNote, Sparkles, AlertCircle, Clock, Bot, User, Bell, Mail, Phone, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'

interface SubTask { id: string; title: string; order: number; deadline: string | null }
interface Resource { id: string; type: string; title: string; url: string; description: string | null }
interface Assignee { user: { id: string; name: string; branch: { name: string } | null }; completedAt: string | null; progress: { subtaskId: string; completed: boolean }[] }
interface Comment { id: string; text: string; createdAt: string; user: { id: string; name: string; role: string } }
interface Task {
  id: string; title: string; description: string | null; notes: string | null; deadline: string | null; priority: string
  group: { title: string; color: string } | null; createdBy: { name: string }
  subtasks: SubTask[]; resources: Resource[]; assignments: Assignee[]; comments: Comment[]
}
interface Educator { id: string; name: string; branch: { name: string } | null }
interface ChatMessage { role: 'user' | 'ai'; text: string }
interface RemindResult { userId: string; name: string; email?: string; emailSent?: boolean; emailError?: string; whatsappLink?: string; whatsapp?: string }

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

export default function AdminTaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [task, setTask] = useState<Task | null>(null)
  const [educators, setEducators] = useState<Educator[]>([])
  const [loading, setLoading] = useState(true)
  const [subtaskForm, setSubtaskForm] = useState({ title: '', deadline: '' })
  const [resourceForm, setResourceForm] = useState({ type: 'URL', title: '', url: '', description: '' })
  const [commentText, setCommentText] = useState('')
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)
  const [selectedAssignees, setSelectedAssignees] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState<string | null>(null)
  const [educatorSearch, setEducatorSearch] = useState('')
  const [aiSuggest, setAiSuggest] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [showRemind, setShowRemind] = useState(false)
  const [remindTargets, setRemindTargets] = useState<Map<string, Set<'email' | 'whatsapp'>>>(new Map())
  const [remindMsg, setRemindMsg] = useState('')
  const [reminding, setReminding] = useState(false)
  const [remindResults, setRemindResults] = useState<RemindResult[]>([])

  async function load() {
    const [t, e] = await Promise.all([
      fetch(`/api/tasks/${id}`).then((r) => r.json()),
      fetch('/api/educators').then((r) => r.json()),
    ])
    if (t.id) {
      setTask(t)
      setNotes(t.notes ?? '')
      setSelectedAssignees(new Set(t.assignments.map((a: Assignee) => a.user.id)))
    }
    setEducators(Array.isArray(e) ? e : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault(); if (!subtaskForm.title.trim()) return
    setSaving('subtask')
    await fetch(`/api/tasks/${id}/subtasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: subtaskForm.title.trim(), deadline: subtaskForm.deadline || null }) })
    setSubtaskForm({ title: '', deadline: '' }); setSaving(null); load()
  }

  async function deleteSubtask(subId: string) {
    await fetch(`/api/tasks/${id}/subtasks`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subId }) })
    load()
  }

  async function addResource(e: React.FormEvent) {
    e.preventDefault(); if (!resourceForm.title || !resourceForm.url) return
    setSaving('resource')
    await fetch(`/api/tasks/${id}/resources`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resourceForm) })
    setResourceForm({ type: 'URL', title: '', url: '', description: '' }); setSaving(null); load()
  }

  async function deleteResource(resourceId: string) {
    await fetch(`/api/tasks/${id}/resources`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resourceId }) })
    load()
  }

  async function saveNotes() {
    setSaving('notes')
    await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }) })
    setSaving(null); setNotesSaved(true); setTimeout(() => setNotesSaved(false), 2000)
  }

  async function saveAssignees() {
    setSaving('assign')
    await fetch(`/api/tasks/${id}/assignments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userIds: [...selectedAssignees] }) })
    setSaving(null); load()
  }

  async function sendComment(e: React.FormEvent) {
    e.preventDefault(); if (!commentText.trim()) return
    setSaving('comment')
    await fetch(`/api/tasks/${id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: commentText }) })
    setCommentText(''); setSaving(null); load()
  }

  function toggleRemindChannel(userId: string, channel: 'email' | 'whatsapp') {
    setRemindTargets((prev) => {
      const n = new Map(prev)
      if (!n.has(userId)) n.set(userId, new Set())
      const ch = new Set(n.get(userId)!)
      ch.has(channel) ? ch.delete(channel) : ch.add(channel)
      n.set(userId, ch)
      return n
    })
  }

  function selectAllRemind(channel: 'email' | 'whatsapp') {
    setRemindTargets((prev) => {
      const n = new Map(prev)
      task?.assignments.forEach((a) => {
        if (!n.has(a.user.id)) n.set(a.user.id, new Set())
        n.get(a.user.id)!.add(channel)
      })
      return n
    })
  }

  async function sendReminders() {
    const targets = [...remindTargets.entries()]
      .filter(([, ch]) => ch.size > 0)
      .map(([userId, ch]) => ({ userId, channels: [...ch] }))
    if (!targets.length) return
    setReminding(true)
    const res = await fetch(`/api/tasks/${id}/remind`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targets, customMessage: remindMsg || undefined }),
    })
    const data = await res.json()
    setRemindResults(data.results ?? [])
    setReminding(false)
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

  async function askAI() {
    if (!task) return
    setAiLoading(true); setAiSuggest('')
    const prompt = `Task: "${task.title}"\nDescription: ${task.description ?? 'none'}\nSubtasks: ${task.subtasks.map((s) => s.title).join(', ')}\n\nProvide 3-4 key admin notes/tips that will help educators complete this task successfully. Be specific and actionable. Format as bullet points.`
    const res = await fetch(`/api/tasks/${id}/ai-chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: prompt }) })
    const data = await res.json()
    setAiSuggest(data.reply ?? '')
    setAiLoading(false)
  }

  function toggleAssignee(uid: string) {
    setSelectedAssignees((prev) => { const n = new Set(prev); n.has(uid) ? n.delete(uid) : n.add(uid); return n })
  }

  if (loading) return <div className="flex justify-center py-24"><div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" /></div>
  if (!task) return <div className="text-center py-16 text-charcoal/40">Task not found.</div>

  return (
    <div className="max-w-5xl mx-auto">
      <Link href="/admin/tasks" className="flex items-center gap-1.5 text-sm text-charcoal/50 hover:text-midnight mb-6 transition-colors">
        <ArrowLeft size={15} /> Back to Tasks
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            {task.group && <p className="text-xs font-semibold mb-1" style={{ color: task.group.color }}>{task.group.title}</p>}
            <h1 className="text-2xl font-bold text-midnight">{task.title}</h1>
            {task.description && <p className="text-charcoal/60 mt-1 text-sm leading-relaxed">{task.description}</p>}
          </div>
          <div className="flex flex-col gap-1 text-right">
            <span className={`text-xs font-bold px-2 py-1 rounded-full self-end ${task.priority === 'HIGH' ? 'bg-red-50 text-red-600' : task.priority === 'LOW' ? 'bg-gray-100 text-charcoal/50' : 'bg-midnight/5 text-midnight'}`}>{task.priority}</span>
            {deadlinePill(task.deadline)}
            <span className="text-xs text-charcoal/40">by {task.createdBy.name}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Subtasks */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-bold text-midnight mb-4 flex items-center gap-2"><CheckSquare size={16} /> Subtasks / Checklist</h2>
            <div className="flex flex-col gap-2 mb-3">
              {task.subtasks.map((s) => (
                <div key={s.id} className="flex items-center gap-3 group p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <Square size={15} className="text-charcoal/30 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-midnight">{s.title}</p>
                    {deadlinePill(s.deadline, true)}
                  </div>
                  <button onClick={() => deleteSubtask(s.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-charcoal/30 hover:text-red-500 transition-all flex-shrink-0">
                    <X size={13} />
                  </button>
                </div>
              ))}
              {task.subtasks.length === 0 && <p className="text-sm text-charcoal/40">No subtasks yet.</p>}
            </div>
            <form onSubmit={addSubtask} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input value={subtaskForm.title} onChange={(e) => setSubtaskForm((f) => ({ ...f, title: e.target.value }))} placeholder="Add subtask…"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight" />
                <input type="date" value={subtaskForm.deadline} onChange={(e) => setSubtaskForm((f) => ({ ...f, deadline: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-charcoal/60 focus:outline-none focus:ring-2 focus:ring-midnight" />
                <Button type="submit" size="sm" loading={saving === 'subtask'} className="flex items-center gap-1 flex-shrink-0"><Plus size={13} /> Add</Button>
              </div>
            </form>
          </div>

          {/* Resources */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-bold text-midnight mb-4 flex items-center gap-2"><Link2 size={16} /> Resources</h2>
            <div className="flex flex-col gap-2 mb-4">
              {task.resources.map((r) => (
                <div key={r.id} className="flex items-start gap-3 p-3 bg-midnight/5 rounded-xl group">
                  <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {r.type === 'URL' ? <Link2 size={14} className="text-midnight" /> : <FileText size={14} className="text-forest" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-midnight">{r.title}</p>
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-charcoal/50 hover:text-midnight truncate block transition-colors">{r.url.slice(0, 55)}{r.url.length > 55 ? '…' : ''}</a>
                    {r.description && <p className="text-xs text-charcoal/60 mt-1 italic">{r.description}</p>}
                  </div>
                  <button onClick={() => deleteResource(r.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-charcoal/30 hover:text-red-500 transition-all flex-shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {task.resources.length === 0 && <p className="text-sm text-charcoal/40">No resources yet.</p>}
            </div>
            <form onSubmit={addResource} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <select value={resourceForm.type} onChange={(e) => setResourceForm((f) => ({ ...f, type: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight">
                  <option value="URL">Link / URL</option>
                  <option value="DOCUMENT">Document</option>
                </select>
                <input value={resourceForm.title} onChange={(e) => setResourceForm((f) => ({ ...f, title: e.target.value }))} placeholder="Resource title"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight" />
              </div>
              <input value={resourceForm.url} onChange={(e) => setResourceForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://…"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight" />
              <div className="flex gap-2">
                <input value={resourceForm.description} onChange={(e) => setResourceForm((f) => ({ ...f, description: e.target.value }))} placeholder="Key points / notes about this resource (optional)"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight" />
                <Button type="submit" size="sm" loading={saving === 'resource'} className="flex items-center gap-1 flex-shrink-0"><Plus size={13} /> Add</Button>
              </div>
            </form>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-midnight flex items-center gap-2"><StickyNote size={16} /> Admin Notes</h2>
              <div className="flex items-center gap-2">
                <button onClick={askAI} disabled={aiLoading}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-olive/10 text-olive hover:bg-olive/20 transition-colors disabled:opacity-50">
                  <Sparkles size={12} /> {aiLoading ? 'Generating…' : 'AI Suggest'}
                </button>
                <Button onClick={saveNotes} size="sm" loading={saving === 'notes'} className={notesSaved ? 'bg-forest text-white' : ''}>
                  {notesSaved ? '✓ Saved' : 'Save Notes'}
                </Button>
              </div>
            </div>
            {aiSuggest && (
              <div className="mb-3 p-3 bg-olive/10 rounded-xl border border-olive/20 text-sm text-charcoal leading-relaxed whitespace-pre-line">
                <p className="text-xs font-semibold text-olive mb-1 flex items-center gap-1"><Sparkles size={11} /> AI Suggestions</p>
                {aiSuggest}
                <button onClick={() => setNotes((n) => n ? n + '\n\n' + aiSuggest : aiSuggest)}
                  className="mt-2 text-xs font-semibold text-olive hover:underline">+ Copy to notes</button>
              </div>
            )}
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5}
              placeholder="Write notes, key points, or instructions for educators assigned to this task…"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight resize-none leading-relaxed" />
          </div>

          {/* Comments */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-bold text-midnight mb-4 flex items-center gap-2"><MessageSquare size={16} /> Comments &amp; Doubts</h2>
            <div className="flex flex-col gap-3 mb-4 max-h-72 overflow-y-auto">
              {task.comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-midnight flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {c.user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-midnight">{c.user.name}</span>
                      <span className={`text-xs ${ROLE_BADGE[c.user.role] ?? 'text-charcoal/40'}`}>{c.user.role.replace('_', ' ')}</span>
                      <span className="text-xs text-charcoal/30 ml-auto">{new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                    </div>
                    <p className="text-sm text-charcoal leading-relaxed">{c.text}</p>
                  </div>
                </div>
              ))}
              {task.comments.length === 0 && <p className="text-sm text-charcoal/40">No comments yet.</p>}
            </div>
            <form onSubmit={sendComment} className="flex gap-2">
              <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Reply or answer a doubt…"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight" />
              <Button type="submit" size="sm" loading={saving === 'comment'} className="flex items-center gap-1"><Send size={13} /></Button>
            </form>
          </div>
          {/* AI Assistant */}
          <div className="bg-midnight rounded-2xl p-5">
            <h2 className="font-bold text-white mb-1 flex items-center gap-2"><Bot size={16} className="text-gold" /> AI Task Assistant</h2>
            <p className="text-xs text-white/40 mb-4">Ask AI about this task — get help with task planning, notes, or educator guidance</p>
            <div className="flex flex-col gap-3 max-h-56 overflow-y-auto mb-3 pr-1">
              {chatMessages.length === 0 && (
                <div className="text-center py-3">
                  <p className="text-xs text-white/30 mb-2">Quick actions:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['Suggest completion steps', 'Write educator guidance', 'List key milestones'].map((q) => (
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
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask AI about this task…"
                className="flex-1 px-3 py-2 bg-white/10 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-gold" />
              <button type="submit" disabled={chatLoading || !chatInput.trim()}
                className="px-4 py-2 bg-gold text-midnight rounded-xl font-semibold text-sm hover:bg-yellow-400 disabled:opacity-40 transition-colors flex-shrink-0">
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>

        {/* Right col */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-bold text-midnight mb-3 flex items-center gap-2"><Users size={16} /> Assign Educators</h2>
            <input
              value={educatorSearch}
              onChange={(e) => setEducatorSearch(e.target.value)}
              placeholder="Search by name or branch…"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-midnight"
            />
            {selectedAssignees.size > 0 && (
              <p className="text-xs text-charcoal/50 mb-2">{selectedAssignees.size} selected</p>
            )}
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto mb-3">
              {educators.filter((e) => {
                const q = educatorSearch.toLowerCase()
                return !q || e.name.toLowerCase().includes(q) || (e.branch?.name ?? '').toLowerCase().includes(q)
              }).map((e) => (
                <button key={e.id} onClick={() => toggleAssignee(e.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${selectedAssignees.has(e.id) ? 'border-midnight bg-midnight/5' : 'border-gray-100 hover:border-gray-200'}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedAssignees.has(e.id) ? 'border-midnight bg-midnight' : 'border-gray-300'}`}>
                    {selectedAssignees.has(e.id) && <CheckCircle size={12} className="text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-midnight">{e.name}</p>
                    {e.branch && <p className="text-xs text-charcoal/40">{e.branch.name}</p>}
                  </div>
                </button>
              ))}
              {educators.filter((e) => { const q = educatorSearch.toLowerCase(); return !q || e.name.toLowerCase().includes(q) || (e.branch?.name ?? '').toLowerCase().includes(q) }).length === 0 && (
                <p className="text-sm text-charcoal/40">{educatorSearch ? `No results for "${educatorSearch}"` : 'No educators found.'}</p>
              )}
            </div>
            <Button onClick={saveAssignees} loading={saving === 'assign'} size="sm" className="w-full">
              Save Assignments ({selectedAssignees.size})
            </Button>
          </div>

          {task.assignments.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-bold text-midnight mb-3">Progress</h2>
              <div className="flex flex-col gap-3">
                {task.assignments.map((a) => {
                  const subtaskDone = a.progress.filter((p) => p.completed).length
                  const subtaskTotal = task.subtasks.length
                  return (
                    <div key={a.user.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="text-sm font-medium text-midnight">{a.user.name.split(' ')[0]}</span>
                          {a.user.branch && <span className="text-xs text-charcoal/40 ml-1.5">{a.user.branch.name}</span>}
                        </div>
                        {a.completedAt
                          ? <span className="text-xs text-forest font-semibold flex items-center gap-1"><CheckCircle size={11} /> Done</span>
                          : subtaskTotal > 0 ? <span className="text-xs text-charcoal/50">{subtaskDone}/{subtaskTotal}</span>
                          : <span className="text-xs text-charcoal/40">Pending</span>}
                      </div>
                      {subtaskTotal > 0 && (
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-midnight rounded-full transition-all" style={{ width: `${Math.round((subtaskDone / subtaskTotal) * 100)}%` }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Send Reminder */}
          {task.assignments.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-midnight flex items-center gap-2"><Bell size={16} /> Send Reminder</h2>
                {!showRemind && (
                  <Button size="sm" onClick={() => { setShowRemind(true); setRemindResults([]); setRemindTargets(new Map()) }} className="bg-olive/80 text-white hover:bg-olive text-xs">
                    <Bell size={12} /> Remind
                  </Button>
                )}
              </div>
              {showRemind && (
                <div className="flex flex-col gap-3">
                  {remindResults.length === 0 ? (
                    <>
                      <div className="flex gap-2 mb-1">
                        <button onClick={() => selectAllRemind('email')} className="text-xs px-2.5 py-1 rounded-lg bg-midnight/5 text-midnight hover:bg-midnight/10 transition-colors flex items-center gap-1"><Mail size={11} /> All Email</button>
                        <button onClick={() => selectAllRemind('whatsapp')} className="text-xs px-2.5 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors flex items-center gap-1"><Phone size={11} /> All WhatsApp</button>
                      </div>
                      {task.assignments.map((a) => {
                        const ch = remindTargets.get(a.user.id) ?? new Set()
                        return (
                          <div key={a.user.id} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-midnight truncate">{a.user.name}</p>
                              {a.user.branch && <p className="text-xs text-charcoal/40">{a.user.branch.name}</p>}
                            </div>
                            <button onClick={() => toggleRemindChannel(a.user.id, 'email')}
                              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-all ${ch.has('email') ? 'bg-midnight text-white border-midnight' : 'border-gray-200 text-charcoal/50 hover:border-midnight/30'}`}>
                              <Mail size={11} /> Email
                            </button>
                            <button onClick={() => toggleRemindChannel(a.user.id, 'whatsapp')}
                              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-all ${ch.has('whatsapp') ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-charcoal/50 hover:border-green-400'}`}>
                              <Phone size={11} /> WA
                            </button>
                          </div>
                        )
                      })}
                      <textarea value={remindMsg} onChange={(e) => setRemindMsg(e.target.value)} rows={2}
                        placeholder="Custom message (optional — leave blank for default)"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-midnight resize-none" />
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setShowRemind(false)} className="flex-1 text-xs">Cancel</Button>
                        <Button size="sm" loading={reminding} onClick={sendReminders}
                          disabled={[...remindTargets.values()].every((ch) => ch.size === 0)}
                          className="flex-1 bg-midnight text-white text-xs">
                          <Send size={12} /> Send
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold text-midnight mb-1">Results</p>
                      {remindResults.map((r) => (
                        <div key={r.userId} className="text-xs border border-gray-100 rounded-xl p-3 flex flex-col gap-1.5">
                          <p className="font-semibold text-midnight">{r.name}</p>
                          {r.email !== undefined && (
                            <p className={`flex items-center gap-1 ${r.emailSent ? 'text-forest' : 'text-red-500'}`}>
                              <Mail size={11} />
                              {r.emailSent ? `✓ Email sent → ${r.email}` : `✗ Email failed: ${r.emailError ?? 'unknown error'}`}
                            </p>
                          )}
                          {r.whatsapp === 'sent' && (
                            <p className="text-green-600 flex items-center gap-1 font-semibold"><Phone size={11} /> ✓ WhatsApp sent</p>
                          )}
                          {r.whatsapp === 'no_phone' && (
                            <p className="text-amber-500 flex items-center gap-1"><Phone size={11} /> No phone number — add phone in educator profile</p>
                          )}
                          {(r.whatsapp === 'link_only' || (r.whatsapp?.startsWith('error:') && r.whatsappLink)) && (
                            <div>
                              {r.whatsapp?.startsWith('error:') && (
                                <p className="text-red-500 flex items-center gap-1 mb-1"><Phone size={11} /> WhatsApp API failed — use manual link below</p>
                              )}
                              <a href={r.whatsappLink!} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1 text-green-600 font-semibold hover:underline">
                                <Phone size={11} /> Send via WhatsApp Web <ExternalLink size={10} />
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                      <Button size="sm" variant="ghost" onClick={() => { setShowRemind(false); setRemindResults([]) }} className="text-xs mt-1">Close</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
