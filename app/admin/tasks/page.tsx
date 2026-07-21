'use client'
import { useState, useEffect } from 'react'
import { Plus, Folder, ClipboardList, Trash2, ChevronRight, Users, Calendar, AlertCircle, CheckCircle, Clock, Edit2, X, UsersRound, Lock, Globe } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface TaskGroup { id: string; title: string; description: string | null; color: string; _count: { tasks: number }; createdBy: { name: string } }
interface EducatorGroup { id: string; name: string; color: string; members: { user: { id: string } }[] }
interface Task {
  id: string; title: string; description: string | null; deadline: string | null
  priority: string; visibility: string; group: { id: string; title: string; color: string } | null
  _count: { assignments: number; comments: number }
  assignments: { user: { id: string; name: string; branch: { name: string } | null }; completedAt: string | null }[]
}

const COLORS = ['#033D4C','#225632','#7D783E','#40403E','#5B4D8A','#9E4A3A','#FECB08']
const PRIORITY_STYLE: Record<string, string> = {
  HIGH: 'bg-red-50 text-red-600',
  NORMAL: 'bg-midnight/5 text-midnight',
  LOW: 'bg-gray-100 text-charcoal/50',
}

function deadlineBadge(d: string | null) {
  if (!d) return null
  const diff = (new Date(d).getTime() - Date.now()) / 86400000
  const label = new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  if (diff < 0) return <span className="flex items-center gap-1 text-xs text-red-600 font-semibold"><AlertCircle size={11} /> Overdue · {label}</span>
  if (diff < 2) return <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold"><Clock size={11} /> Due soon · {label}</span>
  return <span className="flex items-center gap-1 text-xs text-charcoal/50"><Calendar size={11} /> {label}</span>
}

export default function AdminTasksPage() {
  const [groups, setGroups] = useState<TaskGroup[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeGroup, setActiveGroup] = useState<string | 'all'>('all')

  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editGroup, setEditGroup] = useState<TaskGroup | null>(null)
  const [groupForm, setGroupForm] = useState({ title: '', description: '', color: COLORS[0] })
  const [taskForm, setTaskForm] = useState({ title: '', description: '', deadline: '', priority: 'NORMAL', groupId: '', visibility: 'ALL_ADMINS' })
  const [taskEduGroupId, setTaskEduGroupId] = useState('')
  const [eduGroups, setEduGroups] = useState<EducatorGroup[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const [g, t, eg] = await Promise.all([
      fetch('/api/task-groups').then((r) => r.json()),
      fetch('/api/tasks').then((r) => r.json()),
      fetch('/api/educator-groups').then((r) => r.json()),
    ])
    setGroups(Array.isArray(g) ? g : [])
    setTasks(Array.isArray(t) ? t : [])
    setEduGroups(Array.isArray(eg) ? eg : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveGroup(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    const url = editGroup ? `/api/task-groups/${editGroup.id}` : '/api/task-groups'
    const method = editGroup ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(groupForm) })
    const data = await res.json(); setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setShowGroupModal(false); setEditGroup(null); setGroupForm({ title: '', description: '', color: COLORS[0] }); load()
  }

  async function deleteGroup(id: string) {
    if (!confirm('Delete group? All tasks inside will also be deleted.')) return
    await fetch(`/api/task-groups/${id}`, { method: 'DELETE' }); load()
  }

  async function saveTask(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    // Resolve educator group → assigneeIds
    const eduGroup = eduGroups.find((g) => g.id === taskEduGroupId)
    const assigneeIds = eduGroup ? eduGroup.members.map((m) => m.user.id) : undefined
    const res = await fetch('/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...taskForm, groupId: taskForm.groupId || null, deadline: taskForm.deadline || null, assigneeIds }),
    })
    const data = await res.json(); setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setShowTaskModal(false)
    setTaskForm({ title: '', description: '', deadline: '', priority: 'NORMAL', groupId: '', visibility: 'ALL_ADMINS' })
    setTaskEduGroupId('')
    load()
  }

  async function deleteTask(id: string) {
    if (!confirm('Delete task?')) return
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' }); load()
  }

  const filteredTasks = activeGroup === 'all' ? tasks : tasks.filter((t) => t.group?.id === activeGroup)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-midnight flex items-center gap-2"><ClipboardList size={24} /> Task Directory</h1>
          <p className="text-sm text-charcoal/50">{tasks.length} tasks · {groups.length} groups</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setShowGroupModal(true); setEditGroup(null); setGroupForm({ title: '', description: '', color: COLORS[0] }) }} size="sm" className="flex items-center gap-1.5 bg-white border border-gray-200 text-midnight hover:bg-gray-50">
            <Folder size={14} /> New Group
          </Button>
          <Button onClick={() => setShowTaskModal(true)} size="sm" className="flex items-center gap-1.5">
            <Plus size={14} /> New Task
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar: task groups */}
        <div className="w-52 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button onClick={() => setActiveGroup('all')}
              className={`w-full text-left px-4 py-3 text-sm font-semibold flex items-center justify-between border-b border-gray-50 transition-colors ${activeGroup === 'all' ? 'bg-midnight text-white' : 'text-midnight hover:bg-gray-50'}`}>
              <span className="flex items-center gap-2"><ClipboardList size={14} /> All Tasks</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeGroup === 'all' ? 'bg-white/20 text-white' : 'bg-midnight/5'}`}>{tasks.length}</span>
            </button>
            {groups.map((g) => (
              <div key={g.id} className={`border-b border-gray-50 transition-colors ${activeGroup === g.id ? 'bg-midnight/5' : 'hover:bg-gray-50'}`}>
                <button onClick={() => setActiveGroup(g.id)} className="w-full text-left px-4 py-3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                  <span className="text-sm font-medium text-midnight flex-1 truncate">{g.title}</span>
                  <span className="text-xs text-charcoal/40">{g._count.tasks}</span>
                </button>
                <div className="flex items-center gap-1 px-3 pb-2">
                  <button onClick={() => { setEditGroup(g); setGroupForm({ title: g.title, description: g.description ?? '', color: g.color }); setShowGroupModal(true) }}
                    className="p-1 rounded hover:bg-gray-100 text-charcoal/30 hover:text-charcoal transition-colors"><Edit2 size={11} /></button>
                  <button onClick={() => deleteGroup(g.id)} className="p-1 rounded hover:bg-red-50 text-charcoal/30 hover:text-red-500 transition-colors"><Trash2 size={11} /></button>
                </div>
              </div>
            ))}
            {groups.length === 0 && <p className="px-4 py-3 text-xs text-charcoal/40">No groups yet</p>}
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" /></div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-20 text-charcoal/40 bg-white rounded-2xl border border-gray-100">
              <ClipboardList size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No tasks yet. Create one above.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredTasks.map((task) => {
                const done = task.assignments.filter((a) => a.completedAt).length
                const total = task.assignments.length
                return (
                  <div key={task.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-3">
                      {task.group && <div className="w-1 h-full min-h-12 rounded-full flex-shrink-0" style={{ backgroundColor: task.group.color }} />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-bold text-midnight">{task.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PRIORITY_STYLE[task.priority]}`}>{task.priority}</span>
                          {task.group && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: task.group.color + '20', color: task.group.color }}>{task.group.title}</span>}
                          {task.visibility === 'PRIVATE' && <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold"><Lock size={9} /> Only me</span>}
                        </div>
                        {task.description && <p className="text-sm text-charcoal/60 mb-2 line-clamp-2">{task.description}</p>}
                        <div className="flex items-center gap-4 flex-wrap text-xs text-charcoal/50">
                          {deadlineBadge(task.deadline)}
                          <span className="flex items-center gap-1"><Users size={11} /> {total} assigned {total > 0 && `· ${done}/${total} done`}</span>
                          {task._count.comments > 0 && <span>{task._count.comments} comment{task._count.comments > 1 ? 's' : ''}</span>}
                        </div>
                        {total > 0 && (
                          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden w-full max-w-xs">
                            <div className="h-full bg-forest rounded-full transition-all" style={{ width: `${Math.round((done / total) * 100)}%` }} />
                          </div>
                        )}
                        {task.assignments.slice(0, 5).length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            {task.assignments.slice(0, 5).map((a) => (
                              <span key={a.user.id} className={`text-xs px-2 py-0.5 rounded-full ${a.completedAt ? 'bg-forest/10 text-forest' : 'bg-midnight/5 text-midnight'}`}>
                                {a.completedAt && <span>✓ </span>}{a.user.name.split(' ')[0]}
                              </span>
                            ))}
                            {task.assignments.length > 5 && <span className="text-xs text-charcoal/40">+{task.assignments.length - 5} more</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => deleteTask(task.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-charcoal/30 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                        <Link href={`/admin/tasks/${task.id}`}>
                          <button className="flex items-center gap-1 px-3 py-2 bg-midnight text-white text-xs font-semibold rounded-xl hover:bg-midnight/80 transition-colors">
                            Manage <ChevronRight size={13} />
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-midnight">{editGroup ? 'Edit Group' : 'New Task Group'}</h2>
              <button onClick={() => { setShowGroupModal(false); setEditGroup(null) }} className="text-charcoal/40 hover:text-charcoal"><X size={18} /></button>
            </div>
            <form onSubmit={saveGroup} className="flex flex-col gap-3">
              <Input label="Group Title" value={groupForm.title} onChange={(e) => setGroupForm((f) => ({ ...f, title: e.target.value }))} required />
              <Input label="Description (optional)" value={groupForm.description} onChange={(e) => setGroupForm((f) => ({ ...f, description: e.target.value }))} />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-charcoal">Color</label>
                <div className="flex gap-2">{COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setGroupForm((f) => ({ ...f, color: c }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${groupForm.color === c ? 'border-midnight scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}</div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-3 mt-2">
                <Button type="button" onClick={() => { setShowGroupModal(false); setEditGroup(null) }} className="flex-1 bg-gray-100 text-charcoal">Cancel</Button>
                <Button type="submit" loading={saving} className="flex-1">{editGroup ? 'Save' : 'Create'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-midnight">New Task</h2>
              <button onClick={() => setShowTaskModal(false)} className="text-charcoal/40 hover:text-charcoal"><X size={18} /></button>
            </div>
            <form onSubmit={saveTask} className="flex flex-col gap-3">
              <Input label="Task Title" value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} required />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-charcoal">Description</label>
                <textarea value={taskForm.description} onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))} rows={3}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-charcoal">Priority</label>
                  <select value={taskForm.priority} onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))}
                    className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight">
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-charcoal">Deadline</label>
                  <input type="date" value={taskForm.deadline} onChange={(e) => setTaskForm((f) => ({ ...f, deadline: e.target.value }))}
                    className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-charcoal">Task Group</label>
                <select value={taskForm.groupId} onChange={(e) => setTaskForm((f) => ({ ...f, groupId: e.target.value }))}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight">
                  <option value="">No group</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              </div>
              {/* Visibility */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-charcoal">Visibility</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setTaskForm((f) => ({ ...f, visibility: 'ALL_ADMINS' }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${taskForm.visibility === 'ALL_ADMINS' ? 'bg-midnight text-white border-midnight' : 'border-gray-200 text-charcoal hover:bg-gray-50'}`}>
                    <Globe size={13} /> All Admins
                  </button>
                  <button type="button" onClick={() => setTaskForm((f) => ({ ...f, visibility: 'PRIVATE' }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${taskForm.visibility === 'PRIVATE' ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 text-charcoal hover:bg-gray-50'}`}>
                    <Lock size={13} /> Only Me
                  </button>
                </div>
              </div>
              {/* Assign to Educator Group */}
              {eduGroups.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-charcoal flex items-center gap-1.5">
                    <UsersRound size={13} /> Assign to Educator Group
                  </label>
                  <select value={taskEduGroupId} onChange={(e) => setTaskEduGroupId(e.target.value)}
                    className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight">
                    <option value="">— Don't assign yet —</option>
                    {eduGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name} ({g.members.length} educators)</option>
                    ))}
                  </select>
                  {taskEduGroupId && (
                    <p className="text-xs text-forest font-medium">
                      ✓ Will assign {eduGroups.find((g) => g.id === taskEduGroupId)?.members.length ?? 0} educators automatically
                    </p>
                  )}
                </div>
              )}
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <p className="text-xs text-charcoal/40">{taskEduGroupId ? 'Group will be auto-assigned on create.' : 'Or assign educators individually after creating.'}</p>
              <div className="flex gap-3 mt-1">
                <Button type="button" onClick={() => setShowTaskModal(false)} className="flex-1 bg-gray-100 text-charcoal">Cancel</Button>
                <Button type="submit" loading={saving} className="flex-1">Create Task</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
