'use client'

import { useState, useEffect } from 'react'
import { Send, Mail, MessageCircle, Users, CheckCircle, XCircle, ExternalLink, ChevronDown, ChevronUp, Megaphone, FlaskConical, AlertCircle, Minus, ClipboardList, FolderOpen } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Toast from '@/components/Toast'

interface EducatorGroup {
  id: string
  name: string
  color: string
  members: { user: { id: string; name: string } }[]
}

interface Task { id: string; title: string; priority: string; deadline: string | null }
interface Resource { id: string; title: string; type: string; category: string; description: string | null; url: string | null }
interface WaLink { name: string; phone: string; link: string }
interface EmailResult { name: string; email: string; sent: boolean; error?: string }
interface BroadcastResult {
  group: string
  total: number
  emailResults: EmailResult[]
  waLinks: WaLink[]
}

const TEMPLATES = [
  { label: 'Meeting Reminder', subject: 'Meeting Reminder – RYSEN', body: 'Dear Team,\n\nThis is a reminder for our upcoming meeting.\n\nPlease be on time and come prepared.\n\nThank you,\nRYSEN Admin' },
  { label: 'Task Deadline', subject: 'Task Deadline Reminder', body: 'Dear Educator,\n\nThis is a reminder that your pending task deadline is approaching. Please complete it at the earliest.\n\nThank you,\nRYSEN Admin' },
  { label: 'Training Update', subject: 'Training Update – RYSEN', body: 'Dear Team,\n\nPlease log in to the RYSEN portal and complete your pending training stages.\n\nThank you,\nRYSEN Admin' },
  { label: 'General Announcement', subject: 'Announcement – RYSEN Learning Centre', body: '' },
]

export default function BroadcastsPage() {
  const [groups, setGroups] = useState<EducatorGroup[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [groupId, setGroupId] = useState('')
  const [taskId, setTaskId] = useState('')
  const [resourceId, setResourceId] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [channels, setChannels] = useState<('email' | 'whatsapp')[]>(['email'])
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<BroadcastResult | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [waExpanded, setWaExpanded] = useState(true)
  const [emailExpanded, setEmailExpanded] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testPhone, setTestPhone] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<{ channel: string; status: string; detail: string; link?: string }[] | null>(null)

  useEffect(() => {
    fetch('/api/educator-groups').then((r) => r.json()).then((d) => setGroups(Array.isArray(d) ? d : []))
    fetch('/api/tasks').then((r) => r.json()).then((d) => setTasks(Array.isArray(d) ? d : []))
    fetch('/api/resources').then((r) => r.json()).then((d) => setResources(Array.isArray(d) ? d.filter((r: Resource) => r.url) : []))
  }, [])

  function toggleChannel(c: 'email' | 'whatsapp') {
    setChannels((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  }

  function applyTemplate(t: typeof TEMPLATES[0]) {
    setSubject(t.subject)
    setMessage(t.body)
  }

  async function send() {
    if (!groupId || !message.trim() || channels.length === 0) return
    setSending(true); setResult(null)
    const res = await fetch('/api/broadcasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, message, subject, channels, taskId: taskId || undefined, resourceId: resourceId || undefined }),
    })
    const data = await res.json()
    setSending(false)
    if (res.ok) {
      setResult(data)
      setToast({ msg: `Broadcast sent to ${data.total} educators`, type: 'success' })
      setWaExpanded(true); setEmailExpanded(false)
    } else {
      setToast({ msg: data.error ?? 'Failed', type: 'error' })
    }
  }

  async function runTest() {
    if (!testEmail.trim() && !testPhone.trim()) return
    setTesting(true); setTestResults(null)
    const res = await fetch('/api/admin/test-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail.trim() || undefined, phone: testPhone.trim() || undefined }),
    })
    const data = await res.json()
    setTesting(false)
    if (res.ok) setTestResults(data.results)
    else setToast({ msg: data.error ?? 'Test failed', type: 'error' })
  }

  const selectedGroup = groups.find((g) => g.id === groupId)
  const canSend = !!groupId && !!message.trim() && channels.length > 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-midnight flex items-center gap-2"><Megaphone size={24} /> Broadcasts</h1>
        <p className="text-sm text-charcoal/50 mt-0.5">Send email + WhatsApp announcements to educator groups</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose */}
        <div className="space-y-4">
          {/* Group selector */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-bold text-midnight text-sm">1. Select Group</h2>
            <div className="grid grid-cols-1 gap-2">
              {groups.length === 0 ? (
                <p className="text-sm text-charcoal/40">No educator groups yet. Create one in Educator Groups.</p>
              ) : groups.map((g) => (
                <button key={g.id} onClick={() => setGroupId(g.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${groupId === g.id ? 'border-midnight bg-midnight/5' : 'border-gray-100 hover:border-gray-200'}`}>
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-midnight truncate">{g.name}</p>
                    <p className="text-xs text-charcoal/40">{g.members.length} educators</p>
                  </div>
                  {groupId === g.id && <CheckCircle size={16} className="text-forest flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Channel selector */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h2 className="font-bold text-midnight text-sm">2. Channels</h2>
            <div className="flex gap-3">
              <button onClick={() => toggleChannel('email')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-colors ${channels.includes('email') ? 'bg-midnight text-white border-midnight' : 'border-gray-200 text-charcoal/60 hover:bg-gray-50'}`}>
                <Mail size={15} /> Email
              </button>
              <button onClick={() => toggleChannel('whatsapp')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-colors ${channels.includes('whatsapp') ? 'bg-green-500 text-white border-green-500' : 'border-gray-200 text-charcoal/60 hover:bg-gray-50'}`}>
                <MessageCircle size={15} /> WhatsApp
              </button>
            </div>
            {channels.includes('whatsapp') && (
              <p className="text-xs text-charcoal/40 bg-gray-50 rounded-lg px-3 py-2">
                WhatsApp links open in your phone. Tap each to send from your own number — no API needed.
              </p>
            )}
          </div>

          {/* Task selector */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h2 className="font-bold text-midnight text-sm">3. Link a Task <span className="text-charcoal/40 font-normal">(optional)</span></h2>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight/20 bg-white">
              <option value="">— No specific task —</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.priority}] {t.title}{t.deadline ? ` · Due ${new Date(t.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}
                </option>
              ))}
            </select>
            {taskId && (
              <p className="text-xs text-midnight/60 bg-midnight/5 rounded-lg px-3 py-2 flex items-center gap-1.5">
                <ClipboardList size={12} /> Task link will be included in email + WhatsApp message
              </p>
            )}
          </div>

          {/* Resource selector */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h2 className="font-bold text-midnight text-sm">4. Link a Resource <span className="text-charcoal/40 font-normal">(optional)</span></h2>
            <select
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight/20 bg-white">
              <option value="">— No specific resource —</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  [{r.type}] {r.title} · {r.category}
                </option>
              ))}
            </select>
            {resourceId && (
              <p className="text-xs text-forest bg-forest/5 rounded-lg px-3 py-2 flex items-center gap-1.5">
                <FolderOpen size={12} /> Resource card will be included in email + WhatsApp message
              </p>
            )}
          </div>

          {/* Templates */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h2 className="font-bold text-midnight text-sm">5. Compose</h2>
            <div className="flex gap-2 flex-wrap">
              {TEMPLATES.map((t) => (
                <button key={t.label} onClick={() => applyTemplate(t)}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-charcoal/60 hover:border-midnight/30 hover:text-midnight transition-colors">
                  {t.label}
                </button>
              ))}
            </div>
            <Input label="Subject (email only)" placeholder="e.g. Meeting Reminder – RYSEN"
              value={subject} onChange={(e) => setSubject(e.target.value)} />
            <div>
              <label className="text-sm font-semibold text-charcoal block mb-1">Message *</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={7}
                placeholder="Type your message here…"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight/20 resize-none leading-relaxed" />
              <p className="text-xs text-charcoal/30 mt-1">{message.length} chars</p>
            </div>
          </div>

          {/* Send */}
          <Button onClick={send} loading={sending} disabled={!canSend}
            className="w-full flex items-center justify-center gap-2 py-3">
            <Send size={16} />
            {sending ? 'Sending…' : `Send to ${selectedGroup ? selectedGroup.members.length + ' educators' : 'group'}`}
          </Button>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {!result ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 flex flex-col items-center justify-center text-center min-h-64 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-midnight/5 flex items-center justify-center">
                <Megaphone size={22} className="text-midnight/30" />
              </div>
              <p className="text-sm text-charcoal/40">Results appear here after sending</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="bg-midnight rounded-2xl p-5 text-white">
                <p className="text-gold font-bold text-lg">{result.group}</p>
                <p className="text-white/60 text-sm mt-1">Sent to {result.total} educators</p>
                <div className="flex gap-4 mt-3">
                  {result.emailResults.length > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gold">{result.emailResults.filter((r) => r.sent).length}</p>
                      <p className="text-xs text-white/50">emails sent</p>
                    </div>
                  )}
                  {result.waLinks.length > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-400">{result.waLinks.length}</p>
                      <p className="text-xs text-white/50">WA links ready</p>
                    </div>
                  )}
                </div>
              </div>

              {/* WhatsApp links */}
              {result.waLinks.length > 0 && (
                <div className="bg-white rounded-2xl border border-green-100 overflow-hidden">
                  <button onClick={() => setWaExpanded((v) => !v)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left">
                    <div className="flex items-center gap-2">
                      <MessageCircle size={16} className="text-green-500" />
                      <span className="font-bold text-sm text-midnight">WhatsApp Links ({result.waLinks.length})</span>
                      <span className="text-xs text-charcoal/40">— tap each to send from your phone</span>
                    </div>
                    {waExpanded ? <ChevronUp size={14} className="text-charcoal/30" /> : <ChevronDown size={14} className="text-charcoal/30" />}
                  </button>
                  {waExpanded && (
                    <div className="border-t border-green-50 divide-y divide-gray-50">
                      {result.waLinks.map((w) => (
                        <a key={w.phone} href={w.link} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-between px-5 py-3 hover:bg-green-50 transition-colors group">
                          <div>
                            <p className="text-sm font-semibold text-midnight group-hover:text-green-700">{w.name}</p>
                            <p className="text-xs text-charcoal/40">{w.phone}</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 group-hover:text-green-700">
                            <MessageCircle size={13} /> Open WhatsApp <ExternalLink size={11} />
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Email results */}
              {result.emailResults.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <button onClick={() => setEmailExpanded((v) => !v)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left">
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-midnight/60" />
                      <span className="font-bold text-sm text-midnight">Email Results ({result.emailResults.length})</span>
                      <span className="text-xs text-charcoal/40">
                        {result.emailResults.filter((r) => r.sent).length} sent · {result.emailResults.filter((r) => !r.sent).length} failed
                      </span>
                    </div>
                    {emailExpanded ? <ChevronUp size={14} className="text-charcoal/30" /> : <ChevronDown size={14} className="text-charcoal/30" />}
                  </button>
                  {emailExpanded && (
                    <div className="border-t border-gray-50 divide-y divide-gray-50">
                      {result.emailResults.map((r, i) => (
                        <div key={i} className="flex items-center justify-between px-5 py-3">
                          <div>
                            <p className="text-sm font-semibold text-midnight">{r.name}</p>
                            <p className="text-xs text-charcoal/40">{r.email}</p>
                            {r.error && <p className="text-xs text-red-500 mt-0.5">{r.error}</p>}
                          </div>
                          {r.sent
                            ? <CheckCircle size={15} className="text-forest" />
                            : <XCircle size={15} className="text-red-400" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Test Notification Panel */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical size={16} className="text-midnight/60" />
          <h2 className="font-bold text-midnight text-sm">Test Notifications</h2>
          <span className="text-xs text-charcoal/40 ml-1">— verify email + WhatsApp work before sending to groups</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Input label="Test Email" type="email" placeholder="your@email.com"
              value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
            <p className="text-xs text-charcoal/40 mt-1">Sends a real test email via Resend</p>
          </div>
          <div>
            <Input label="Test Phone (WhatsApp)" type="tel" placeholder="+91 9876543210"
              value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
            <p className="text-xs text-charcoal/40 mt-1">Opens wa.me link — sends from your WhatsApp</p>
          </div>
        </div>
        <Button onClick={runTest} loading={testing}
          disabled={!testEmail.trim() && !testPhone.trim()}
          className="flex items-center gap-2 bg-midnight/80 hover:bg-midnight">
          <FlaskConical size={14} /> Run Test
        </Button>

        {/* Test results */}
        {testResults && (
          <div className="mt-4 flex flex-col gap-2">
            {testResults.map((r, i) => (
              <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm ${
                r.status === 'sent' ? 'bg-forest/5 border border-forest/20' :
                r.status === 'error' ? 'bg-red-50 border border-red-200' :
                r.status === 'link' ? 'bg-green-50 border border-green-200' :
                'bg-gray-50 border border-gray-100'
              }`}>
                <span className="mt-0.5 flex-shrink-0">
                  {r.status === 'sent' && <CheckCircle size={15} className="text-forest" />}
                  {r.status === 'error' && <XCircle size={15} className="text-red-500" />}
                  {r.status === 'link' && <MessageCircle size={15} className="text-green-500" />}
                  {r.status === 'skipped' && <Minus size={15} className="text-charcoal/30" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-midnight capitalize">{r.channel}</p>
                  <p className={`text-xs mt-0.5 ${r.status === 'error' ? 'text-red-600' : 'text-charcoal/60'}`}>{r.detail}</p>
                  {r.link && (
                    <a href={r.link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-green-700 bg-green-100 px-3 py-1.5 rounded-lg hover:bg-green-200 transition-colors">
                      <MessageCircle size={12} /> Open WhatsApp to send test <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
