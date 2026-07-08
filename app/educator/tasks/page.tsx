'use client'
import { useState, useEffect } from 'react'
import { ClipboardList, Calendar, AlertCircle, Clock, CheckCircle, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Task {
  id: string; title: string; description: string | null; deadline: string | null; priority: string
  group: { title: string; color: string } | null; _count: { comments: number }
  subtasks: { id: string; title: string }[]
}
interface Assignment {
  task: Task; completedAt: string | null
  progress: { subtaskId: string; completed: boolean }[]
}

const PRIORITY_COLOR: Record<string, string> = { HIGH: 'bg-red-50 text-red-600', NORMAL: 'bg-midnight/5 text-midnight', LOW: 'bg-gray-100 text-charcoal/50' }

function deadlinePill(d: string | null) {
  if (!d) return null
  const diff = (new Date(d).getTime() - Date.now()) / 86400000
  const label = new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  if (diff < 0) return <span className="flex items-center gap-1 text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-full"><AlertCircle size={10} /> Overdue · {label}</span>
  if (diff < 2) return <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full"><Clock size={10} /> Due soon · {label}</span>
  return <span className="flex items-center gap-1 text-xs text-charcoal/50 bg-gray-100 px-2 py-0.5 rounded-full"><Calendar size={10} /> {label}</span>
}

export default function EducatorTasksPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')

  useEffect(() => {
    fetch('/api/tasks').then((r) => r.json()).then((d) => {
      setAssignments(Array.isArray(d) ? d : [])
      setLoading(false)
    })
  }, [])

  const filtered = assignments.filter((a) => {
    if (filter === 'done') return !!a.completedAt
    if (filter === 'pending') return !a.completedAt
    return true
  })

  const done = assignments.filter((a) => a.completedAt).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-midnight flex items-center gap-2"><ClipboardList size={24} /> My Tasks</h1>
          <p className="text-sm text-charcoal/50 mt-0.5">{done}/{assignments.length} completed</p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['all', 'pending', 'done'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${filter === f ? 'bg-midnight text-white' : 'text-charcoal/60 hover:text-midnight'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      {assignments.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-midnight">Overall Progress</span>
            <span className="text-sm font-bold text-midnight">{done}/{assignments.length}</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-midnight rounded-full transition-all duration-500" style={{ width: `${Math.round((done / assignments.length) * 100)}%` }} />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-charcoal/40 bg-white rounded-2xl border border-gray-100">
          <ClipboardList size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">{filter === 'done' ? 'No completed tasks yet.' : filter === 'pending' ? 'All tasks done!' : 'No tasks assigned yet.'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((a) => {
            const subtaskDone = a.progress.filter((p) => p.completed).length
            const subtaskTotal = a.task.subtasks.length
            return (
              <Link href={`/educator/tasks/${a.task.id}`} key={a.task.id}>
                <div className={`bg-white rounded-2xl border p-5 hover:shadow-sm transition-all cursor-pointer ${a.completedAt ? 'border-forest/20 bg-forest/5' : 'border-gray-100'}`}>
                  <div className="flex items-start gap-3">
                    {a.task.group && <div className="w-1 min-h-12 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: a.task.group.color }} />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {a.completedAt && <CheckCircle size={15} className="text-forest flex-shrink-0" />}
                        <h3 className={`font-bold ${a.completedAt ? 'text-forest line-through opacity-70' : 'text-midnight'}`}>{a.task.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PRIORITY_COLOR[a.task.priority]}`}>{a.task.priority}</span>
                        {a.task.group && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: a.task.group.color + '20', color: a.task.group.color }}>{a.task.group.title}</span>}
                      </div>
                      {a.task.description && <p className="text-sm text-charcoal/60 mb-2 line-clamp-2">{a.task.description}</p>}
                      <div className="flex items-center gap-3 flex-wrap">
                        {deadlinePill(a.task.deadline)}
                        {subtaskTotal > 0 && <span className="text-xs text-charcoal/50">{subtaskDone}/{subtaskTotal} subtasks</span>}
                        {a.task._count.comments > 0 && <span className="text-xs text-charcoal/40">{a.task._count.comments} comment{a.task._count.comments > 1 ? 's' : ''}</span>}
                      </div>
                      {subtaskTotal > 0 && (
                        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-xs">
                          <div className="h-full bg-midnight rounded-full transition-all" style={{ width: `${Math.round((subtaskDone / subtaskTotal) * 100)}%` }} />
                        </div>
                      )}
                    </div>
                    <ChevronRight size={18} className="text-charcoal/30 flex-shrink-0 mt-1" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
