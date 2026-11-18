'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Layers, ClipboardList, ChevronRight, Trash2, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface StudentProgram {
  id: string; title: string; description: string | null
  targetClass: string; isPublished: boolean
  _count: { tests: number }
  branch?: { id: string; name: string } | null
}
interface Campus { id: string; name: string }

export default function StudentProgramList({ basePath, admin = false }: { basePath: string; admin?: boolean }) {
  const router = useRouter()
  const [programs, setPrograms] = useState<StudentProgram[]>([])
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', targetClass: '', branchId: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [programResponse, branchesResponse] = await Promise.all([
        fetch('/api/student-programs'),
        admin ? fetch('/api/branches') : Promise.resolve(null),
      ])
      const [programData, branchesData] = await Promise.all([
        programResponse.json(),
        branchesResponse?.json() ?? Promise.resolve([]),
      ])
      if (cancelled) return
      setPrograms(Array.isArray(programData) ? programData : [])
      setCampuses(Array.isArray(branchesData) ? branchesData : [])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [admin])

  async function reloadPrograms() {
    const response = await fetch('/api/student-programs')
    const data = await response.json()
    setPrograms(Array.isArray(data) ? data : [])
  }

  async function createProgram(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch('/api/student-programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, branchId: admin ? form.branchId || null : undefined, isPublished: false }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setShowAdd(false)
    setForm({ title: '', description: '', targetClass: '', branchId: '' })
    router.push(`${basePath}/${data.id}`)
  }

  async function togglePublish(p: StudentProgram) {
    await fetch(`/api/student-programs/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !p.isPublished }),
    })
    reloadPrograms()
  }

  async function deleteProgram(id: string) {
    if (!confirm('Delete this program? Tests inside it stay — they just become unassigned.')) return
    await fetch(`/api/student-programs/${id}`, { method: 'DELETE' })
    reloadPrograms()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-midnight flex items-center gap-2">
            <Layers size={24} /> Student Programs
          </h1>
          <p className="text-sm text-charcoal/60 mt-0.5">Create and publish lessons and tests for students in your branch · {programs.length} programs</p>
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
              {admin && (
                <label className="flex flex-col gap-1 text-sm font-semibold text-charcoal">
                  Campus
                  <select value={form.branchId} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl font-normal">
                    <option value="">All campuses</option>
                    {campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
                  </select>
                </label>
              )}
              <p className="text-xs text-charcoal/40">You&apos;ll attach existing tests to it on the next screen.</p>
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
                  {admin && <span className="text-xs bg-gray-100 text-charcoal px-2 py-0.5 rounded-full">{p.branch?.name ?? 'All campuses'}</span>}
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
                <Link href={`${basePath}/${p.id}`}>
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
