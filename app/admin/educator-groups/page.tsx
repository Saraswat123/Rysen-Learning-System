'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, X, Users, Edit2, Check } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Toast from '@/components/Toast'

interface Member { id: string; user: { id: string; name: string; email: string; branch: { name: string } | null } }
interface Group { id: string; name: string; description: string | null; color: string; members: Member[] }
interface Educator { id: string; name: string; email: string; branch: { name: string } | null }

const COLORS = ['#033D4C', '#225632', '#7D783E', '#40403E', '#5B4D8A', '#9E4A3A', '#1a6b8a', '#FECB08']

export default function EducatorGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [educators, setEducators] = useState<Educator[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Group | null>(null)
  const [form, setForm] = useState({ name: '', description: '', color: '#033D4C' })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  async function load() {
    const [gr, er] = await Promise.all([fetch('/api/educator-groups'), fetch('/api/educators')])
    if (gr.ok) setGroups(await gr.json())
    if (er.ok) {
      const data = await er.json()
      setEducators(Array.isArray(data) ? data : data.educators ?? [])
    }
  }
  useEffect(() => { load() }, [])

  function openCreate() {
    setForm({ name: '', description: '', color: '#033D4C' })
    setSelectedIds(new Set())
    setEditId(null)
    setShowCreate(true)
  }

  function openEdit(g: Group) {
    setForm({ name: g.name, description: g.description ?? '', color: g.color })
    setSelectedIds(new Set(g.members.map((m) => m.user.id)))
    setEditId(g.id)
    setShowCreate(true)
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = { name: form.name.trim(), description: form.description.trim() || null, color: form.color, memberIds: [...selectedIds] }
    const res = editId
      ? await fetch(`/api/educator-groups/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/educator-groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) {
      setToast({ msg: editId ? 'Group updated' : 'Group created', type: 'success' })
      setShowCreate(false)
      load()
    } else {
      setToast({ msg: 'Failed to save', type: 'error' })
    }
    setSaving(false)
  }

  async function del(g: Group) {
    const res = await fetch(`/api/educator-groups/${g.id}`, { method: 'DELETE' })
    if (res.ok) { setToast({ msg: `"${g.name}" deleted`, type: 'success' }); setConfirmDelete(null); load() }
  }

  function toggleMember(id: string) {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const filteredEducators = educators.filter((e) =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || (e.branch?.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const branches = Array.from(new Set(educators.map((e) => e.branch?.name).filter(Boolean))) as string[]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-midnight">Educator Groups</h1>
          <p className="text-sm text-charcoal/60 mt-0.5">Create named groups — assign entire group to tasks with one click</p>
        </div>
        <Button onClick={openCreate} size="sm"><Plus size={14} /> New Group</Button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl text-charcoal/30">
          <Users size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">No groups yet</p>
          <p className="text-xs mt-1">Create groups like "STEM Educators", "Ganganagar Team", "All Principals"</p>
          <button onClick={openCreate} className="mt-4 text-xs font-bold text-midnight underline">Create first group</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {groups.map((g) => (
            <div key={g.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-stretch">
                <div className="w-2 flex-shrink-0" style={{ backgroundColor: g.color }} />
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-midnight">{g.name}</h2>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: g.color }}>
                          {g.members.length} educator{g.members.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {g.description && <p className="text-sm text-charcoal/50 mt-0.5">{g.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(g)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-midnight/5 text-midnight hover:bg-midnight/10 transition-colors">
                        <Edit2 size={12} /> Edit
                      </button>
                      <button onClick={() => setConfirmDelete(g)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {g.members.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {g.members.map((m) => (
                        <span key={m.id} className="text-xs bg-gray-50 border border-gray-100 text-charcoal/70 px-2.5 py-1 rounded-full">
                          {m.user.name}{m.user.branch ? ` · ${m.user.branch.name}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-midnight">{editId ? 'Edit Group' : 'New Educator Group'}</h3>
              <button onClick={() => setShowCreate(false)} className="text-charcoal/40 hover:text-midnight"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <Input label="Group Name *" placeholder='e.g. STEM Educators, Ganganagar Team'
                value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <Input label="Description" placeholder="Optional note about this group"
                value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              {/* Color picker */}
              <div>
                <label className="text-sm font-semibold text-charcoal mb-2 block">Color</label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderColor: form.color === c ? '#000' : 'transparent' }}>
                      {form.color === c && <Check size={12} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Member selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-charcoal">
                    Select Educators <span className="text-charcoal/40 font-normal">({selectedIds.size} selected)</span>
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedIds(new Set(educators.map((e) => e.id)))}
                      className="text-xs text-midnight font-semibold hover:underline">All</button>
                    <span className="text-charcoal/30">·</span>
                    <button onClick={() => setSelectedIds(new Set())}
                      className="text-xs text-charcoal/50 hover:underline">None</button>
                  </div>
                </div>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or campus…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-midnight/20" />

                {/* Branch quick-select */}
                {branches.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {branches.map((b) => {
                      const bIds = educators.filter((e) => e.branch?.name === b).map((e) => e.id)
                      const allSelected = bIds.every((id) => selectedIds.has(id))
                      return (
                        <button key={b} onClick={() => {
                          setSelectedIds((prev) => {
                            const n = new Set(prev)
                            allSelected ? bIds.forEach((id) => n.delete(id)) : bIds.forEach((id) => n.add(id))
                            return n
                          })
                        }}
                          className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${allSelected ? 'bg-midnight text-white border-midnight' : 'border-gray-200 text-charcoal/60 hover:border-midnight/30'}`}>
                          {allSelected ? '✓ ' : ''}{b}
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="border border-gray-100 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  {filteredEducators.map((e, i) => (
                    <label key={e.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-midnight/3 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                      <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleMember(e.id)}
                        className="w-4 h-4 accent-midnight flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-midnight truncate">{e.name}</p>
                        <p className="text-xs text-charcoal/40 truncate">{e.branch?.name ?? 'No campus'} · {e.email}</p>
                      </div>
                    </label>
                  ))}
                  {filteredEducators.length === 0 && (
                    <p className="text-xs text-charcoal/30 text-center py-6">No educators match</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-4 border-t border-gray-100">
              <Button variant="ghost" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button className="flex-1" loading={saving} onClick={save} disabled={!form.name.trim()}>
                {editId ? 'Save Changes' : `Create Group${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-midnight mb-2">Delete Group?</h3>
            <p className="text-sm text-charcoal/60 mb-1"><strong>"{confirmDelete.name}"</strong> with {confirmDelete.members.length} member{confirmDelete.members.length !== 1 ? 's' : ''}</p>
            <p className="text-xs text-charcoal/40 mb-6">Only the group is deleted. Educators and their tasks are not affected.</p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <button onClick={() => del(confirmDelete)} className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-sm transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
