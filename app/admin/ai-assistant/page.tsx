'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Plus, Trash2, RefreshCw, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface ActionResult { message?: string; error?: string; [key: string]: unknown }
interface Action { tool: string; args: Record<string, unknown>; result: ActionResult }
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  actions?: Action[]
  loading?: boolean
}

type GroqMsg = { role: 'user' | 'assistant'; content: string }

const TOOL_LABELS: Record<string, string> = {
  create_task: '✦ Task Created',
  update_task: '✎ Task Updated',
  delete_task: '✕ Task Deleted',
  assign_educators: '⊕ Educators Assigned',
  add_subtask: '☑ Subtask Added',
  add_resource: '⊞ Resource Added',
  create_task_group: '⊕ Group Created',
  list_tasks: '↓ Tasks Fetched',
  list_educators: '↓ Educators Fetched',
  list_task_groups: '↓ Groups Fetched',
  get_task: '↓ Task Details Fetched',
}

const SUGGESTIONS = [
  'Create a task "Weekly Report Submission" due this Friday with HIGH priority',
  'List all tasks assigned to educators',
  'Create a task group called "STEM Activities" and add 3 tasks to it',
  'Show me all overdue tasks',
  'Assign all educators in Delhi branch to task "Safety Training"',
  'Add subtasks to the last task: Review materials, Submit report, Attend meeting',
  'Delete all tasks with LOW priority',
  'Create a complete onboarding task with subtasks and resources',
]

function ActionCard({ action, expanded, onToggle }: { action: Action; expanded: boolean; onToggle: () => void }) {
  const label = TOOL_LABELS[action.tool] ?? action.tool
  const success = !action.result.error
  return (
    <div className={`rounded-xl border text-xs overflow-hidden ${success ? 'border-forest/20 bg-forest/5' : 'border-red-200 bg-red-50'}`}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2 text-left">
        <div className="flex items-center gap-2">
          {success ? <CheckCircle size={13} className="text-forest" /> : <AlertCircle size={13} className="text-red-500" />}
          <span className={`font-semibold ${success ? 'text-forest' : 'text-red-600'}`}>{label}</span>
          {(action.result.message || action.result.error) && (
            <span className="text-charcoal/50 truncate max-w-[200px]">{String(action.result.message ?? action.result.error)}</span>
          )}
        </div>
        {expanded ? <ChevronUp size={12} className="text-charcoal/40" /> : <ChevronDown size={12} className="text-charcoal/40" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-current/10">
          <pre className="text-[10px] text-charcoal/60 overflow-x-auto whitespace-pre-wrap mt-2">{JSON.stringify(action.result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const [expandedActions, setExpandedActions] = useState<Set<number>>(new Set())

  if (msg.role === 'user') {
    return (
      <div className="flex gap-3 justify-end">
        <div className="max-w-xl bg-midnight text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
          {msg.content}
        </div>
        <div className="w-8 h-8 rounded-full bg-midnight flex items-center justify-center flex-shrink-0">
          <User size={15} className="text-gold" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center flex-shrink-0 mt-1">
        <Bot size={15} className="text-midnight" />
      </div>
      <div className="flex-1 max-w-2xl">
        {msg.loading ? (
          <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-midnight/40 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-midnight/40 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-midnight/40 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {msg.actions && msg.actions.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {msg.actions.map((a, i) => (
                  <ActionCard key={i} action={a} expanded={expandedActions.has(i)} onToggle={() => setExpandedActions((prev) => {
                    const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n
                  })} />
                ))}
              </div>
            )}
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-charcoal whitespace-pre-wrap">
              {msg.content}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  function newChat() {
    setMessages([])
    setInput('')
    inputRef.current?.focus()
  }

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg }
    const loadingMsg: Message = { id: Date.now().toString() + '-ai', role: 'assistant', content: '', loading: true }

    setMessages((prev) => [...prev, userMsg, loadingMsg])
    setLoading(true)

    // Build conversation history for API (only user/assistant text, not action metadata)
    const history: GroqMsg[] = []
    for (const m of messages) {
      if (m.loading) continue
      history.push({ role: m.role, content: m.content })
    }
    history.push({ role: 'user', content: msg })

    try {
      const res = await fetch('/api/ai/task-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })
      const data = await res.json() as { reply: string; actions: Action[] }

      setMessages((prev) => [
        ...prev.filter((m) => !m.loading),
        { id: Date.now().toString() + '-resp', role: 'assistant', content: data.reply, actions: data.actions },
      ])
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => !m.loading),
        { id: Date.now().toString() + '-err', role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    }
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-midnight flex items-center justify-center">
            <Bot size={18} className="text-gold" />
          </div>
          <div>
            <h1 className="font-bold text-midnight text-lg leading-none">RYSEN AI</h1>
            <p className="text-xs text-charcoal/50 mt-0.5">Task Management Assistant · Llama 3.3 70B</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-forest bg-forest/10 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" /> Online
          </span>
          <button onClick={newChat} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-midnight/20 text-midnight hover:bg-midnight/5 transition-colors">
            <Plus size={13} /> New Chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-midnight flex items-center justify-center mx-auto mb-4">
                <Sparkles size={28} className="text-gold" />
              </div>
              <h2 className="text-2xl font-bold text-midnight mb-2">RYSEN AI Task Assistant</h2>
              <p className="text-charcoal/50 text-sm max-w-md">Create, manage, assign, and delete tasks using natural language. Just type what you need.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="text-left px-4 py-3 rounded-2xl border border-gray-100 bg-white hover:border-midnight/20 hover:shadow-sm transition-all text-sm text-charcoal/70 hover:text-midnight">
                  <span className="text-midnight font-medium block mb-0.5 truncate">{s.split(' ').slice(0, 4).join(' ')}…</span>
                  <span className="text-xs text-charcoal/40 line-clamp-2">{s}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m) => <MessageBubble key={m.id} msg={m} />)}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-white px-6 py-4">
        {!isEmpty && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 hide-scrollbar">
            {['List all tasks', 'Show task groups', 'List educators', 'Create a task', 'Assign educators'].map((s) => (
              <button key={s} onClick={() => send(s)}
                className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-gray-200 text-charcoal/60 hover:text-midnight hover:border-midnight/30 transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-midnight focus-within:ring-2 focus-within:ring-midnight/10 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Create a task, assign educators, list tasks…"
            rows={1}
            style={{ resize: 'none', minHeight: '24px', maxHeight: '120px' }}
            className="flex-1 bg-transparent text-sm text-midnight placeholder-charcoal/40 focus:outline-none leading-relaxed"
            onInput={(e) => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 120) + 'px'
            }}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-midnight text-white flex items-center justify-center disabled:opacity-30 hover:bg-midnight/80 transition-colors flex-shrink-0">
            {loading ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
        <p className="text-center text-xs text-charcoal/30 mt-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
