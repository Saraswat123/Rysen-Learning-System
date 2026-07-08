'use client'
import { useState, useEffect, useRef } from 'react'
import { Bell, Check, CheckCheck, ClipboardList, MessageSquare, X } from 'lucide-react'
import Link from 'next/link'

interface Notif {
  id: string; title: string; message: string; type: string
  read: boolean; relatedId: string | null; createdAt: string
}

function timeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function NotificationBell({ taskPath = '/admin/tasks' }: { taskPath?: string }) {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  async function load() {
    try {
      const data = await fetch('/api/notifications').then((r) => r.json())
      if (Array.isArray(data)) setNotifs(data)
    } catch {}
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 30000) // poll every 30s
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const unread = notifs.filter((n) => !n.read).length

  async function markAll() {
    await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) })
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  async function markOne(id: string) {
    await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gold text-midnight text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-midnight text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAll} className="text-xs text-midnight/60 hover:text-midnight flex items-center gap-1">
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-charcoal/40 hover:text-charcoal"><X size={14} /></button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 && (
              <div className="py-8 text-center text-charcoal/40 text-sm">No notifications yet</div>
            )}
            {notifs.map((n) => (
              <div key={n.id}
                className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-pointer ${n.read ? 'opacity-60' : ''}`}
                onClick={() => { markOne(n.id); setOpen(false) }}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${n.type === 'COMMENT' ? 'bg-olive/10' : 'bg-midnight/5'}`}>
                  {n.type === 'COMMENT'
                    ? <MessageSquare size={14} className="text-olive" />
                    : <ClipboardList size={14} className="text-midnight" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-midnight">{n.title}</p>
                  <p className="text-xs text-charcoal/60 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                  <p className="text-xs text-charcoal/30 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <div className="w-2 h-2 bg-gold rounded-full flex-shrink-0 mt-1.5" />}
              </div>
            ))}
          </div>
          {notifs.length > 0 && (
            <Link href={taskPath} onClick={() => setOpen(false)}
              className="block text-center text-xs font-semibold text-midnight/60 hover:text-midnight py-3 border-t border-gray-100 transition-colors">
              View all tasks →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
