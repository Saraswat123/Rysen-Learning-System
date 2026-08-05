'use client'

import { useState, useEffect } from 'react'
import { History, CheckCircle2, Clock, AlertCircle, ChevronDown, Users, Calendar, Flag, Search, Filter } from 'lucide-react'

interface Assignee {
  userId: string; name: string; email: string; branch: string | null
  assignedAt: string; completedAt: string | null
  status: 'completed' | 'in_progress' | 'pending'
  subtasksCompleted: number; subtasksTotal: number; lastActivity: string | null
}
interface SubTask { id: string; title: string; deadline: string | null; order: number }
interface TaskHistory {
  id: string; title: string; description: string | null
  priority: string; deadline: string | null
  createdAt: string; createdBy: { name: string; email: string }
  group: { title: string; color: string } | null
  subtasks: SubTask[]
  totalAssignees: number; completedAssignees: number; pendingAssignees: number
  completionRate: number; assignees: Assignee[]
  overallStatus: 'completed' | 'in_progress' | 'pending' | 'unassigned'
}

const STATUS_CONFIG = {
  completed: { label: 'Completed', color: 'bg-forest/10 text-forest', dot: 'bg-forest' },
  in_progress: { label: 'In Progress', color: 'bg-blue-50 text-blue-600', dot: 'bg-blue-500' },
  pending: { label: 'Pending', color: 'bg-amber-50 text-amber-600', dot: 'bg-amber-400' },
  unassigned: { label: 'Unassigned', color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-300' },
}

const PRIORITY_CONFIG = {
  HIGH: { label: 'High', color: 'text-red-500 bg-red-50' },
  NORMAL: { label: 'Normal', color: 'text-blue-500 bg-blue-50' },
  LOW: { label: 'Low', color: 'text-gray-500 bg-gray-100' },
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  return `${d}d ago`
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-24">
      <div className="h-full rounded-full transition-all"
        style={{ width: `${value}%`, backgroundColor: value === 100 ? '#225632' : value > 50 ? '#3b82f6' : '#f59e0b' }} />
    </div>
  )
}

export default function TaskHistoryPage() {
  const [tasks, setTasks] = useState<TaskHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch(`/api/admin/task-history?status=${statusFilter}`).then(r => r.json()).then(d => {
      if (d.tasks) setTasks(d.tasks)
      setLoading(false)
    })
  }, [statusFilter])

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = tasks.filter(t =>
    search ? t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.createdBy.name.toLowerCase().includes(search.toLowerCase()) : true
  )

  const summary = {
    total: tasks.length,
    completed: tasks.filter(t => t.overallStatus === 'completed').length,
    inProgress: tasks.filter(t => t.overallStatus === 'in_progress').length,
    pending: tasks.filter(t => t.overallStatus === 'pending').length,
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-midnight flex items-center gap-2">
          <History size={22} /> Task History
        </h1>
        <p className="text-sm text-charcoal/60 mt-0.5">Full timeline of task creation, assignment and completion per educator</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Tasks', value: summary.total, color: 'bg-midnight', icon: History },
          { label: 'Completed', value: summary.completed, color: 'bg-forest', icon: CheckCircle2 },
          { label: 'In Progress', value: summary.inProgress, color: 'bg-blue-500', icon: Clock },
          { label: 'Pending', value: summary.pending, color: 'bg-amber-400', icon: AlertCircle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon size={16} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-charcoal/40 font-medium">{label}</p>
              <p className="text-xl font-bold text-midnight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/30" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search task or creator…"
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight/20" />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          {[
            { key: 'all', label: 'All' },
            { key: 'completed', label: 'Completed' },
            { key: 'pending', label: 'Pending / Active' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => { setStatusFilter(key); setLoading(true) }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${statusFilter === key ? 'bg-white text-midnight shadow-sm' : 'text-charcoal/50 hover:text-midnight'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-charcoal/30 text-sm">
          No tasks found
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const sc = STATUS_CONFIG[t.overallStatus]
            const pc = PRIORITY_CONFIG[t.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.NORMAL
            const isOpen = expanded.has(t.id)

            return (
              <div key={t.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Task header */}
                <button onClick={() => toggle(t.id)} className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Status dot */}
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${sc.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-midnight">{t.title}</p>
                          {t.group && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: t.group.color + '22', color: t.group.color }}>
                              {t.group.title}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${pc.color}`}>
                            <Flag size={9} className="inline mr-0.5" />{pc.label}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${sc.color}`}>
                            {sc.label}
                          </span>
                        </div>
                        {t.description && <p className="text-xs text-charcoal/50 mt-0.5 truncate">{t.description}</p>}

                        {/* Timeline row */}
                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                          <span className="text-xs text-charcoal/40 flex items-center gap-1">
                            <Calendar size={11} /> Created {fmt(t.createdAt)} · {daysAgo(t.createdAt)}
                          </span>
                          <span className="text-xs text-charcoal/40">by {t.createdBy.name}</span>
                          {t.deadline && (
                            <span className={`text-xs flex items-center gap-1 ${new Date(t.deadline) < new Date() && t.overallStatus !== 'completed' ? 'text-red-500 font-semibold' : 'text-charcoal/40'}`}>
                              <Clock size={11} /> Due {fmt(t.deadline)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: completion stats + chevron */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="flex items-center gap-2 justify-end">
                          <ProgressBar value={t.completionRate} />
                          <span className="text-sm font-bold text-midnight">{t.completionRate}%</span>
                        </div>
                        <p className="text-xs text-charcoal/40 mt-0.5">
                          <Users size={10} className="inline mr-0.5" />
                          {t.completedAssignees}/{t.totalAssignees} done
                        </p>
                      </div>
                      <ChevronDown size={16} className={`text-charcoal/30 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-gray-50 px-5 py-4 space-y-4">
                    {/* Subtasks */}
                    {t.subtasks.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-charcoal/40 uppercase tracking-wider mb-2">Subtasks</p>
                        <div className="flex flex-wrap gap-2">
                          {t.subtasks.map((st) => (
                            <span key={st.id} className="text-xs bg-gray-100 text-charcoal/70 px-2.5 py-1 rounded-lg">
                              {st.title}{st.deadline ? ` · due ${fmt(st.deadline)}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Assignee timeline table */}
                    <div>
                      <p className="text-xs font-bold text-charcoal/40 uppercase tracking-wider mb-2">Educator Timeline</p>
                      {t.assignees.length === 0 ? (
                        <p className="text-xs text-charcoal/30">No educators assigned</p>
                      ) : (
                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left px-4 py-2.5 font-bold text-charcoal/40">Educator</th>
                                <th className="text-left px-4 py-2.5 font-bold text-charcoal/40 hidden sm:table-cell">Campus</th>
                                <th className="text-left px-4 py-2.5 font-bold text-charcoal/40">Assigned</th>
                                <th className="text-left px-4 py-2.5 font-bold text-charcoal/40">Completed</th>
                                <th className="text-left px-4 py-2.5 font-bold text-charcoal/40 hidden md:table-cell">Subtasks</th>
                                <th className="text-left px-4 py-2.5 font-bold text-charcoal/40">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {t.assignees.map((a) => {
                                const asc = STATUS_CONFIG[a.status]
                                return (
                                  <tr key={a.userId} className="border-t border-gray-50 hover:bg-gray-50/50">
                                    <td className="px-4 py-3">
                                      <p className="font-semibold text-midnight">{a.name}</p>
                                      <p className="text-charcoal/40">{a.email}</p>
                                    </td>
                                    <td className="px-4 py-3 text-charcoal/60 hidden sm:table-cell">{a.branch ?? '—'}</td>
                                    <td className="px-4 py-3 text-charcoal/60">{fmt(a.assignedAt)}</td>
                                    <td className="px-4 py-3">
                                      {a.completedAt ? (
                                        <div>
                                          <p className="text-forest font-semibold">{fmt(a.completedAt)}</p>
                                          <p className="text-charcoal/30">{fmtTime(a.completedAt)}</p>
                                        </div>
                                      ) : (
                                        <span className="text-charcoal/30">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell">
                                      {t.subtasks.length > 0 ? (
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full bg-forest"
                                              style={{ width: `${t.subtasks.length > 0 ? (a.subtasksCompleted / t.subtasks.length) * 100 : 0}%` }} />
                                          </div>
                                          <span className="text-charcoal/50">{a.subtasksCompleted}/{t.subtasks.length}</span>
                                        </div>
                                      ) : <span className="text-charcoal/30">—</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`px-2 py-0.5 rounded-full font-semibold text-xs ${asc.color}`}>
                                        {asc.label}
                                      </span>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
