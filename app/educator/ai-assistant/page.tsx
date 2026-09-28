'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Plus, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface ActionResult { message?: string; error?: string; [key: string]: unknown }
interface Action { tool: string; args: Record<string, unknown>; result: ActionResult | ActionResult[] }
interface Message { id: string; role: 'user' | 'assistant'; content: string; actions?: Action[]; loading?: boolean }
type GroqMsg = { role: 'user' | 'assistant'; content: string }

const TOOL_LABELS: Record<string, string> = {
  get_my_tasks: '↓ Tasks fetched',
  get_task_details: '↓ Task details fetched',
  mark_subtask_complete: '✓ Subtask updated',
  get_my_resources: '↓ Resources fetched',
  get_my_student_tests: '↓ Student tests fetched',
  get_my_student_progress_summary: '↓ Student progress fetched',
  get_my_recognition: '↓ Recognition score fetched',
}

const SUGGESTIONS = [
  'What tasks do I have pending?',
  'How do I create a student test?',
  'Summarize my students\' performance',
  'What resources are shared with me?',
  'What\'s my recognition score this month?',
]

function ActionCard({ action, expanded, onToggle }: { action: Action; expanded: boolean; onToggle: () => void }) {
  const label = TOOL_LABELS[action.tool] ?? action.tool
  const r = Array.isArray(action.result) ? action.result[0] : action.result
  const success = !r?.error
  return (
    <div className={`rounded-xl border text-xs overflow-hidden ${success ? 'border-forest/20 bg-forest/5' : 'border-red-200 bg-red-50'}`}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2 text-left">
        <div className="flex items-center gap-2 min-w-0">
          {success ? <CheckCircle size={13} className="text-forest flex-shrink-0" /> : <AlertCircle size={13} className="text-red-500 flex-shrink-0" />}
          <span className={`font-semibold flex-shrink-0 ${success ? 'text-forest' : 'text-red-600'}`}>{label}</span>
        </div>
        {expanded ? <ChevronUp size={12} className="text-charcoal/40 flex-shrink-0" /> : <ChevronDown size={12} className="text-charcoal/40 flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-current/10 overflow-x-auto">
          <pre className="text-[10px] text-charcoal/60 whitespace-pre-wrap mt-2 break-words">{JSON.stringify(action.result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const [expandedActions, setExpandedActions] = useState<Set<number>>(new Set())

  if (msg.role === 'user') {
    return (
      <div className="flex gap-2.5 justify-end">
        <div className="max-w-[85%] sm:max-w-md bg-midnight text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed break-words">
          {msg.content}
        </div>
        <div className="w-7 h-7 rounded-full bg-midnight flex items-center justify-center flex-shrink-0">
          <User size={13} className="text-gold" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2.5">
      <div className="w-7 h-7 rounded-full bg-gold flex items-center justify-center flex-shrink-0 mt-1">
        <Bot size={13} className="text-midnight" />
      </div>
      <div className="flex-1 min-w-0 max-w-[85%] sm:max-w-md">
        {msg.loading ? (
          <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 w-fit">
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
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed text-charcoal whitespace-pre-wrap break-words">
              {msg.content}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function EducatorAIAssistantPage() {
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

    const history: GroqMsg[] = []
    for (const m of messages) {
      if (m.loading) continue
      history.push({ role: m.role, content: m.content })
    }
    history.push({ role: 'user', content: msg })

    try {
      const res = await fetch('/api/ai/educator-agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history }),
      })
      const data = await res.json() as { reply: string; actions: Action[] }
      setMessages((prev) => [...prev.filter((m) => !m.loading), { id: Date.now().toString() + '-resp', role: 'assistant', content: data.reply, actions: data.actions }])
    } catch (err) {
      setMessages((prev) => [...prev.filter((m) => !m.loading), { id: Date.now().toString() + '-err', role: 'assistant', content: `Error: ${String(err)}` }])
    }
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const isEmpty = messages.length === 0

  return (
    // dvh (dynamic viewport height), not vh — on mobile Safari/Chrome the address
    // bar shrinks/grows the visible area, and vh is fixed to the LARGEST possible
    // viewport, so the input row and bottom of the chat get pushed off screen
    // behind the browser chrome. dvh tracks the actual visible height. Sized against
    // the educator layout's fixed header (~4rem) + main's py-8 (~4rem) overhead
    // instead of fighting it with negative margins, which would also break the
    // max-w-6xl centered container this page sits inside.
    <div className="flex flex-col h-[calc(100dvh-8.5rem)] min-h-[420px] max-h-[calc(100dvh-8.5rem)] rounded-2xl border border-gray-100 overflow-hidden bg-cream">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-midnight flex items-center justify-center flex-shrink-0">
            <Bot size={16} className="text-gold" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-midnight text-base sm:text-lg leading-none truncate">RYSEN AI</h1>
            <p className="text-xs text-charcoal/50 mt-0.5 truncate">Your task & campus assistant</p>
          </div>
        </div>
        <button onClick={newChat} className="flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-xl border border-midnight/20 text-midnight hover:bg-midnight/5 transition-colors flex-shrink-0">
          <Plus size={13} /> <span className="hidden sm:inline">New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-2">
            <div className="w-14 h-14 rounded-2xl bg-midnight flex items-center justify-center mb-4">
              <Bot size={26} className="text-gold" />
            </div>
            <h2 className="text-lg font-bold text-midnight mb-1">Hi, ask me anything</h2>
            <p className="text-sm text-charcoal/50 mb-6 max-w-xs">Tasks, resources, student tests, your recognition score, or how to do something on RYSEN</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="text-xs px-3 py-2 rounded-xl bg-white border border-gray-200 text-charcoal/70 hover:border-midnight/30 hover:text-midnight transition-colors text-left">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 max-w-2xl mx-auto">
            {messages.map((m) => <MessageBubble key={m.id} msg={m} />)}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 bg-white px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your tasks, tests, resources…"
            rows={1}
            className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-midnight/20 max-h-28"
          />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-midnight text-gold rounded-xl hover:bg-midnight/90 disabled:opacity-40 transition-colors">
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
