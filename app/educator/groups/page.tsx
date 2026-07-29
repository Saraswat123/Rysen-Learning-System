'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Users, Send, FolderOpen, ExternalLink, FileText, FileSpreadsheet,
  Video, Link as LinkIcon, File, ChevronRight, MessageSquare,
} from 'lucide-react'

interface Member { id: string; name: string; branch: { name: string } | null }
interface Group {
  id: string; name: string; description: string | null; color: string
  members: { id: string; user: Member }[]
  resources: Resource[]
}
interface Resource {
  id: string; title: string; description: string | null; url: string | null
  type: string; category: string
}
interface Message {
  id: string; text: string; createdAt: string
  user: { id: string; name: string; branch: { name: string } | null }
}

const TYPE_META: Record<string, { label: string; icon: React.ComponentType<{ size: number; className?: string }> }> = {
  DRIVE: { label: 'Drive', icon: FolderOpen },
  SHEET: { label: 'Sheet', icon: FileSpreadsheet },
  DOC: { label: 'Doc', icon: FileText },
  VIDEO: { label: 'Video', icon: Video },
  PDF: { label: 'PDF', icon: File },
  LINK: { label: 'Link', icon: LinkIcon },
  DOCUMENT: { label: 'File', icon: File },
  TASK: { label: 'Task', icon: FileText },
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export default function EducatorGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [activeGroup, setActiveGroup] = useState<Group | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [myId, setMyId] = useState('')
  const [activeTab, setActiveTab] = useState<'chat' | 'resources'>('chat')
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setMyId(d.user?.id ?? ''))
    fetch('/api/educator-groups').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setGroups(data)
        if (data.length > 0) setActiveGroup(data[0])
      }
    })
  }, [])

  const loadMessages = useCallback(async (groupId: string) => {
    const res = await fetch(`/api/educator-groups/${groupId}/messages`)
    if (res.ok) {
      const data = await res.json()
      setMessages(data)
    }
  }, [])

  useEffect(() => {
    if (!activeGroup) return
    loadMessages(activeGroup.id)
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => loadMessages(activeGroup.id), 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeGroup, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !activeGroup || sending) return
    setSending(true)
    const res = await fetch(`/api/educator-groups/${activeGroup.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (res.ok) {
      setText('')
      await loadMessages(activeGroup.id)
    }
    setSending(false)
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-charcoal/30">
        <Users size={48} className="mb-4 opacity-20" />
        <p className="text-base font-medium">Not in any group yet</p>
        <p className="text-sm mt-1">Admin will add you to a group</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-midnight">My Groups</h1>
        <p className="text-sm text-charcoal/60 mt-0.5">Chat and collaborate with your group members</p>
      </div>

      <div className="flex gap-4 h-[680px]">
        {/* Group list sidebar */}
        <div className="w-56 flex-shrink-0 flex flex-col gap-2">
          {groups.map((g) => (
            <button key={g.id} onClick={() => { setActiveGroup(g); setActiveTab('chat') }}
              className={`w-full text-left px-4 py-3 rounded-2xl border transition-all ${activeGroup?.id === g.id ? 'border-midnight bg-midnight text-white shadow-lg' : 'border-gray-200 bg-white text-charcoal hover:border-midnight/30 hover:shadow-sm'}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{g.name}</p>
                  <p className={`text-xs mt-0.5 ${activeGroup?.id === g.id ? 'text-white/50' : 'text-charcoal/40'}`}>
                    {g.members.length} member{g.members.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Main panel */}
        {activeGroup && (
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden shadow-sm">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: activeGroup.color }}>
                  <Users size={15} className="text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-midnight text-sm">{activeGroup.name}</h2>
                  {activeGroup.description && <p className="text-xs text-charcoal/40">{activeGroup.description}</p>}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                <button onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'chat' ? 'bg-white text-midnight shadow-sm' : 'text-charcoal/50 hover:text-charcoal'}`}>
                  <MessageSquare size={11} /> Chat
                </button>
                <button onClick={() => setActiveTab('resources')}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'resources' ? 'bg-white text-midnight shadow-sm' : 'text-charcoal/50 hover:text-charcoal'}`}>
                  <FolderOpen size={11} /> Resources {activeGroup.resources.length > 0 && <span className="bg-midnight text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{activeGroup.resources.length}</span>}
                </button>
              </div>
            </div>

            {activeTab === 'chat' ? (
              <>
                {/* Members strip */}
                <div className="px-5 py-2 border-b border-gray-50 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-charcoal/30 font-medium">Members:</span>
                  {activeGroup.members.map((m) => (
                    <span key={m.id} className="text-xs bg-gray-100 text-charcoal/70 px-2 py-0.5 rounded-full font-medium">
                      {m.user.name}{m.user.branch ? ` · ${m.user.branch.name}` : ''}
                    </span>
                  ))}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-charcoal/20">
                      <MessageSquare size={36} className="mb-2 opacity-30" />
                      <p className="text-sm">No messages yet — start the conversation</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.user.id === myId
                      return (
                        <div key={msg.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: activeGroup.color }}>
                            {msg.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                            {!isMe && <p className="text-[10px] text-charcoal/40 font-medium px-1">{msg.user.name}</p>}
                            <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-midnight text-white rounded-tr-sm' : 'bg-gray-100 text-charcoal rounded-tl-sm'}`}>
                              {msg.text}
                            </div>
                            <p className="text-[10px] text-charcoal/30 px-1">{formatTime(msg.createdAt)}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <form onSubmit={sendMessage} className="px-4 py-3 border-t border-gray-100 flex gap-2 items-end">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e as unknown as React.FormEvent) } }}
                    placeholder="Type a message… (Enter to send)"
                    rows={1}
                    className="flex-1 resize-none px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight/20 max-h-32"
                  />
                  <button type="submit" disabled={!text.trim() || sending}
                    className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-2xl bg-midnight text-white disabled:opacity-30 hover:bg-midnight/90 transition-colors">
                    <Send size={15} />
                  </button>
                </form>
              </>
            ) : (
              /* Resources tab */
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {activeGroup.resources.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-charcoal/20">
                    <FolderOpen size={36} className="mb-2 opacity-30" />
                    <p className="text-sm">No resources added to this group yet</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {activeGroup.resources.filter(r => (r as Resource & {isPublished?: boolean}).isPublished !== false).map((r) => {
                      const meta = TYPE_META[r.type] ?? TYPE_META['LINK']
                      const Icon = meta.icon
                      return (
                        <a key={r.id} href={r.url ?? '#'} target={r.url ? '_blank' : undefined} rel="noopener noreferrer"
                          className={`flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-midnight/20 hover:shadow-sm transition-all group ${!r.url ? 'opacity-50 pointer-events-none' : ''}`}>
                          <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                            <Icon size={16} className="text-midnight/50" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-midnight truncate">{r.title}</p>
                            {r.description && <p className="text-xs text-charcoal/40 truncate mt-0.5">{r.description}</p>}
                            <p className="text-xs text-charcoal/30 truncate mt-0.5">{r.category}</p>
                          </div>
                          <ExternalLink size={13} className="text-charcoal/20 group-hover:text-midnight flex-shrink-0 transition-colors" />
                        </a>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
