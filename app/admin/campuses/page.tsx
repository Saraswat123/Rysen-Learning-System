'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, MapPin, Building2, Users, GraduationCap, X, Save, Loader2, School } from 'lucide-react'

interface Branch {
  id: string
  name: string
  location: string
  _count: { users: number; students: number }
}

export default function CampusesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', location: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')

  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', location: '' })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/branches?counts=1')
    const data = await res.json()
    setBranches(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    setAddLoading(true)
    const res = await fetch('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    })
    const data = await res.json()
    setAddLoading(false)
    if (!res.ok) { setAddError(data.error); return }
    setAddForm({ name: '', location: '' })
    setShowAdd(false)
    load()
  }

  function openEdit(b: Branch) {
    setEditId(b.id)
    setEditForm({ name: b.name, location: b.location })
    setEditError('')
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editId) return
    setEditError('')
    setEditLoading(true)
    const res = await fetch(`/api/branches/${editId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    const data = await res.json()
    setEditLoading(false)
    if (!res.ok) { setEditError(data.error); return }
    setEditId(null)
    load()
  }

  async function handleDelete(id: string) {
    setDeleteError('')
    setDeleteLoading(true)
    const res = await fetch(`/api/branches/${id}`, { method: 'DELETE' })
    const data = await res.json()
    setDeleteLoading(false)
    if (!res.ok) { setDeleteError(data.error); setDeleteId(null); return }
    setDeleteId(null)
    load()
  }

  const totalEducators = branches.reduce((s, b) => s + (b._count?.users ?? 0), 0)
  const totalStudents = branches.reduce((s, b) => s + (b._count?.students ?? 0), 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-midnight">Campuses</h1>
          <p className="text-sm text-charcoal/60 mt-0.5">{branches.length} campus{branches.length !== 1 ? 'es' : ''} across RYSEN network</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setAddError('') }}
          className="flex items-center gap-2 bg-midnight text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-midnight/90 transition-colors"
        >
          <Plus size={16} /> Add Campus
        </button>
      </div>

      {/* Summary cards */}
      {branches.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-midnight text-white rounded-2xl p-4">
            <School size={18} className="opacity-60 mb-2" />
            <p className="text-2xl font-bold">{branches.length}</p>
            <p className="text-xs text-white/60 mt-0.5">Total Campuses</p>
          </div>
          <div className="bg-forest text-white rounded-2xl p-4">
            <GraduationCap size={18} className="opacity-60 mb-2" />
            <p className="text-2xl font-bold">{totalEducators || '—'}</p>
            <p className="text-xs text-white/60 mt-0.5">Educators</p>
          </div>
          <div className="bg-olive text-white rounded-2xl p-4">
            <Users size={18} className="opacity-60 mb-2" />
            <p className="text-2xl font-bold">{totalStudents || '—'}</p>
            <p className="text-xs text-white/60 mt-0.5">Students</p>
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-midnight">New Campus</h2>
            <button onClick={() => setShowAdd(false)} className="text-charcoal/40 hover:text-charcoal p-1 rounded-lg hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-charcoal/60 uppercase tracking-wide mb-1 block">Campus Name</label>
              <input
                required
                placeholder="e.g. RYSEN Ganganagar"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-midnight/30"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-charcoal/60 uppercase tracking-wide mb-1 block">Location / City</label>
              <input
                required
                placeholder="e.g. Ganganagar, Rajasthan"
                value={addForm.location}
                onChange={(e) => setAddForm((f) => ({ ...f, location: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-midnight/30"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={addLoading}
                className="flex items-center gap-2 bg-midnight text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-midnight/90 transition-colors disabled:opacity-60"
              >
                {addLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {addLoading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
          {addError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{addError}</p>}
        </div>
      )}

      {/* Delete error toast */}
      {deleteError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
          {deleteError}
          <button onClick={() => setDeleteError('')}><X size={14} /></button>
        </div>
      )}

      {/* Campus list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
        </div>
      ) : branches.length === 0 ? (
        <div className="text-center py-20 text-charcoal/40">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No campuses yet</p>
          <p className="text-sm mt-1">Add first campus to get started</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {branches.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {editId === b.id ? (
                /* Edit inline */
                <form onSubmit={handleEdit} className="p-5 flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-charcoal/60 uppercase tracking-wide mb-1 block">Campus Name</label>
                    <input
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-midnight/30"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-charcoal/60 uppercase tracking-wide mb-1 block">Location / City</label>
                    <input
                      required
                      value={editForm.location}
                      onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-midnight/30"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={editLoading}
                      className="flex items-center gap-1.5 bg-midnight text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-midnight/90 transition-colors disabled:opacity-60"
                    >
                      {editLoading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      {editLoading ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditId(null)}
                      className="px-3 py-2.5 rounded-xl text-charcoal/50 hover:bg-gray-100 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {editError && <p className="text-sm text-red-600 w-full">{editError}</p>}
                </form>
              ) : (
                /* Display row */
                <div className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 bg-midnight/8 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-midnight" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-midnight text-sm">{b.name}</p>
                    <p className="text-xs text-charcoal/50 flex items-center gap-1 mt-0.5">
                      <MapPin size={11} /> {b.location}
                    </p>
                  </div>
                  {b._count && (
                    <div className="hidden sm:flex items-center gap-4 text-xs text-charcoal/50">
                      <span className="flex items-center gap-1"><GraduationCap size={12} /> {b._count.users} educators</span>
                      <span className="flex items-center gap-1"><Users size={12} /> {b._count.students} students</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(b)}
                      className="p-2 text-charcoal/40 hover:text-midnight hover:bg-midnight/5 rounded-lg transition-colors"
                      title="Edit campus"
                    >
                      <Pencil size={15} />
                    </button>
                    {deleteId === b.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-red-600 font-medium">Delete?</span>
                        <button
                          onClick={() => handleDelete(b.id)}
                          disabled={deleteLoading}
                          className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
                        >
                          {deleteLoading ? '…' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setDeleteId(null)}
                          className="px-2.5 py-1 bg-gray-100 text-charcoal rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteId(b.id)}
                        className="p-2 text-charcoal/40 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete campus"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
