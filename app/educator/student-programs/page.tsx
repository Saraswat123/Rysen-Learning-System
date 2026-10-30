'use client'

import { useState, useEffect } from 'react'
import { Plus, Layers, ClipboardList, ChevronRight, Trash2, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface StudentProgram {
  id: string; title: string; description: string | null
  targetClass: string; isPublished: boolean
  _count: { tests: number }
}

export default function StudentProgramsPage() {
  const [programs, setPrograms] = useState<StudentProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', targetClass: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const data = await fetch('/api/student-programs').then((r) => r.json())
    setPrograms(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createProgram(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch('/api/student-programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setShowAdd(false)
    setForm({ title: '', description: '', targetClass: '' })
    load()
  }

  async function togglePublish(p: StudentProgram) {
    await fetch(`/api/student-programs/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !p.isPublished }),
    })
    load()
  }

  async function deleteProgram(id: string) {
    if (!confirm('Delete this program? Tests inside it stay — they just become unassigned.')) return
    await fetch(`/api/student-programs/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-midnight flex items-center gap-2">
            <Layers size={24} /> Student Programs
          </h1>
          <p className="text-sm text-charcoal/60 mt-0.5">Group your tests into a named program for your class · {programs.length} programs</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2">
          <Plus size={15} /> Create Program
        </Button>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-midnight mb-4">Create Student Program</h2>
            <form onSubmit={createProgram} className="flex flex-col gap-3">
              <Input label="Program Title" placeholder="e.g. Term 2 STEM Track" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
              <Input label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              <Input label="Target Class" placeholder="e.g. 6" value={form.targetClass} onChange={(e) => setForm((f) => ({ ...f, targetClass: e.target.value }))} />
              <p className="text-xs text-charcoal/40">You'll attach existing tests to it on the next screen.</p>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-3 mt-2">
                <Button type="button" onClick={() => setShowAdd(false)} className="flex-1 bg-gray-100 text-charcoal hover:bg-gray-200">Cancel</Button>
                <Button type="submit" loading={saving} className="flex-1">Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {programs.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-midnight/5 flex items-center justify-center flex-shrink-0">
                <Layers size={22} className="text-midnight" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-midnight">{p.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.isPublished ? 'bg-forest/10 text-forest' : 'bg-amber-100 text-amber-700'}`}>
                    {p.isPublished ? 'Published' : 'Draft'}
                  </span>
                  {p.targetClass && <span className="text-xs bg-midnight/5 text-midnight px-2 py-0.5 rounded-full">Class {p.targetClass}</span>}
                </div>
                {p.description && <p className="text-sm text-charcoal/60 mt-0.5 truncate">{p.description}</p>}
                <div className="flex items-center gap-4 mt-1.5 text-xs text-charcoal/50">
                  <span className="flex items-center gap-1"><ClipboardList size={11} /> {p._count.tests} tests</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => togglePublish(p)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-charcoal/40 hover:text-charcoal transition-colors" title={p.isPublished ? 'Unpublish' : 'Publish'}>
                  {p.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button onClick={() => deleteProgram(p.id)}
                  className="p-2 rounded-lg hover:bg-red-50 text-charcoal/40 hover:text-red-600 transition-colors" title="Delete program">
                  <Trash2 size={16} />
                </button>
                <Link href={`/educator/student-programs/${p.id}`}>
                  <button className="flex items-center gap-1.5 px-3 py-2 bg-midnight text-white text-xs font-semibold rounded-xl hover:bg-midnight/80 transition-colors">
                    Manage <ChevronRight size={14} />
                  </button>
                </Link>
              </div>
            </div>
          ))}
          {programs.length === 0 && (
            <div className="text-center py-16 text-charcoal/40">
              <Layers size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No student programs yet — group your tests into one for your class.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
