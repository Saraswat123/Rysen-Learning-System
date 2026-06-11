'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, X, ChevronRight, CheckCircle, Circle, Layers, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Toast from '@/components/Toast'

interface Program {
  id: string; name: string; description: string | null
  isPublished: boolean; applicableTo: string; order: number
  _count: { stages: number }
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', applicableTo: 'BOTH' })
  const [confirmDelete, setConfirmDelete] = useState<Program | null>(null)

  async function load() {
    const data = await fetch('/api/programs').then((r) => r.json())
    setPrograms(data)
  }

  useEffect(() => { load() }, [])

  async function togglePublish(p: Program) {
    await fetch(`/api/programs/${p.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !p.isPublished }),
    })
    setToast({ msg: `${p.name} ${!p.isPublished ? 'published' : 'unpublished'}`, type: 'success' })
    load()
  }

  async function createProgram() {
    if (!form.name.trim()) return
    setCreating(true)
    const res = await fetch('/api/programs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() || null, applicableTo: form.applicableTo, isPublished: false }),
    })
    if (res.ok) {
      setToast({ msg: `"${form.name}" created`, type: 'success' })
      setShowCreate(false)
      setForm({ name: '', description: '', applicableTo: 'BOTH' })
      load()
    } else {
      setToast({ msg: 'Failed to create', type: 'error' })
    }
    setCreating(false)
  }

  async function deleteProgram(p: Program) {
    await fetch(`/api/programs/${p.id}`, { method: 'DELETE' })
    setToast({ msg: `"${p.name}" deleted. Its stages are now unassigned.`, type: 'success' })
    setConfirmDelete(null)
    load()
  }

  const APPLICABLE_LABEL: Record<string, string> = { BOTH: 'Educators & Principals', EDUCATOR: 'Educators Only', PRINCIPAL: 'Principals Only' }

  return (
    <div className="max-w-4xl mx-auto">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-midnight">Training Programs</h1>
          <p className="text-sm text-charcoal/60">Each program is an independent set of stages with its own progression</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm"><Plus size={14} /> New Program</Button>
      </div>

      <div className="flex flex-col gap-4">
        {programs.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-midnight flex items-center justify-center flex-shrink-0">
                  <Layers size={20} className="text-gold" />
                </div>
                <div>
                  <h3 className="font-bold text-midnight">{p.name}</h3>
                  {p.description && <p className="text-sm text-charcoal/60 mt-0.5">{p.description}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-charcoal/40">
                    <span>{p._count.stages} stages</span>
                    <span>{APPLICABLE_LABEL[p.applicableTo] ?? p.applicableTo}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => togglePublish(p)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${p.isPublished ? 'bg-forest/10 text-forest hover:bg-forest/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {p.isPublished ? <CheckCircle size={14} /> : <Circle size={14} />}
                  {p.isPublished ? 'Published' : 'Draft'}
                </button>
                <Link href={`/admin/stages?programId=${p.id}`}>
                  <Button variant="ghost" size="sm"><ChevronRight size={14} /> Manage Stages</Button>
                </Link>
                <button onClick={() => setConfirmDelete(p)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {programs.length === 0 && (
          <div className="text-center py-16 text-charcoal/40">
            <Layers size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No programs yet. Create your first training program.</p>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-midnight">New Training Program</h3>
              <button onClick={() => setShowCreate(false)} className="text-charcoal/40 hover:text-midnight"><X size={20} /></button>
            </div>
            <div className="flex flex-col gap-4">
              <Input label="Program Name *" placeholder="e.g. Leadership Development Module"
                value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-charcoal">Description</label>
                <textarea placeholder="Brief description of this program..." value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-midnight resize-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-charcoal">Visible To</label>
                <select value={form.applicableTo} onChange={(e) => setForm((f) => ({ ...f, applicableTo: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-midnight text-sm">
                  <option value="BOTH">Both Educators & Principals</option>
                  <option value="EDUCATOR">Educators Only</option>
                  <option value="PRINCIPAL">Principals / Center Heads Only</option>
                </select>
              </div>
              <p className="text-xs text-charcoal/40">Stages added after creation. Program starts as Draft — publish when ready.</p>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="ghost" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button className="flex-1" loading={creating} onClick={createProgram} disabled={!form.name.trim()}>Create Program</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-midnight mb-2">Delete Program?</h3>
            <p className="text-sm text-charcoal/60 mb-1">
              <strong className="text-midnight">{confirmDelete.name}</strong> and its configuration will be deleted.
            </p>
            <p className="text-sm text-amber-600 mb-6">Its {confirmDelete._count.stages} stages will become unassigned (not deleted).</p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <button onClick={() => deleteProgram(confirmDelete)}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-sm transition-colors">
                Delete Program
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
