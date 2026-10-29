'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Building2, MapPin, GraduationCap, Users, School,
  Plus, Trash2, X, Save, Loader2,
} from 'lucide-react'

interface Branch { id: string; name: string; location: string }
interface StaffUser { id: string; name: string; email: string; phone: string | null; branchId: string | null }
interface Student { id: string; name: string; class: string; section: string; isActive: boolean; branch: Branch | null }

type Tab = 'educators' | 'principals' | 'students'

export default function CampusDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [branch, setBranch] = useState<Branch | null>(null)
  const [educators, setEducators] = useState<StaffUser[]>([])
  const [principals, setPrincipals] = useState<StaffUser[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('educators')

  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', class: '', section: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [branches, edu, prin, stu] = await Promise.all([
      fetch('/api/branches').then((r) => r.json()),
      fetch('/api/educators').then((r) => r.json()),
      fetch('/api/principals').then((r) => r.json()),
      fetch(`/api/students?branchId=${id}`).then((r) => r.json()),
    ])
    const b = (Array.isArray(branches) ? branches : []).find((x: Branch) => x.id === id)
    setBranch(b ?? null)
    setEducators((Array.isArray(edu) ? edu : []).filter((e: StaffUser) => e.branchId === id))
    setPrincipals((Array.isArray(prin) ? prin : []).filter((p: StaffUser) => p.branchId === id))
    setStudents(Array.isArray(stu) ? stu : [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setForm({ name: '', email: '', phone: '', class: '', section: '' })
    setError('')
    setShowAdd(true)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    let res: Response
    if (tab === 'students') {
      res = await fetch('/api/students', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, class: form.class, section: form.section, branchId: id }),
      })
    } else {
      const endpoint = tab === 'educators' ? '/api/educators' : '/api/principals'
      res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, branchId: id }),
      })
    }
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Failed to save'); return }
    setShowAdd(false)
    load()
  }

  async function remove(kind: Tab, removeId: string) {
    if (!confirm('Remove this entry? This cannot be undone.')) return
    const endpoint = kind === 'educators' ? `/api/educators/${removeId}`
      : kind === 'principals' ? `/api/principals/${removeId}`
      : `/api/students/${removeId}`
    await fetch(endpoint, { method: 'DELETE' })
    load()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!branch) return (
    <div className="max-w-2xl mx-auto text-center py-20 text-charcoal/40">
      <Building2 size={40} className="mx-auto mb-3 opacity-30" />
      <p className="font-medium">Campus not found</p>
      <button onClick={() => router.push('/admin/campuses')} className="text-midnight text-sm font-semibold mt-3 hover:underline">
        ← Back to Campuses
      </button>
    </div>
  )

  const TABS: { key: Tab; label: string; icon: typeof GraduationCap; count: number }[] = [
    { key: 'educators', label: 'Educators', icon: GraduationCap, count: educators.length },
    { key: 'principals', label: 'Principal', icon: Users, count: principals.length },
    { key: 'students', label: 'Students', icon: School, count: students.length },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => router.push('/admin/campuses')}
        className="flex items-center gap-1.5 text-sm text-charcoal/50 hover:text-midnight transition-colors">
        <ArrowLeft size={15} /> All Campuses
      </button>

      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-midnight/8 rounded-2xl flex items-center justify-center flex-shrink-0">
          <Building2 size={22} className="text-midnight" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-midnight">{branch.name}</h1>
          <p className="text-sm text-charcoal/50 flex items-center gap-1 mt-0.5">
            <MapPin size={12} /> {branch.location}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.key ? 'border-midnight text-midnight' : 'border-transparent text-charcoal/50 hover:text-midnight'
            }`}>
            <t.icon size={15} /> {t.label}
            <span className="text-xs bg-gray-100 text-charcoal/60 px-1.5 py-0.5 rounded-full">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-charcoal/50">
          {tab === 'educators' && 'Educators assigned to this campus.'}
          {tab === 'principals' && 'Principal(s) overseeing this campus.'}
          {tab === 'students' && 'Students enrolled at this campus.'}
        </p>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-midnight text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-midnight/90 transition-colors">
          <Plus size={15} /> Add {tab === 'educators' ? 'Educator' : tab === 'principals' ? 'Principal' : 'Student'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-midnight text-sm">New {tab === 'educators' ? 'Educator' : tab === 'principals' ? 'Principal' : 'Student'} — {branch.name}</h2>
            <button onClick={() => setShowAdd(false)} className="text-charcoal/40 hover:text-charcoal p-1 rounded-lg hover:bg-gray-100"><X size={16} /></button>
          </div>
          <form onSubmit={handleAdd} className="grid sm:grid-cols-2 gap-3">
            <input required placeholder="Full name" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-midnight/30 sm:col-span-2" />
            {tab !== 'students' ? (
              <>
                <input required type="email" placeholder="Email" value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-midnight/30" />
                <input placeholder="Phone (optional)" value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-midnight/30" />
              </>
            ) : (
              <>
                <input required placeholder="Class (e.g. 5)" value={form.class}
                  onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-midnight/30" />
                <input placeholder="Section (optional)" value={form.section}
                  onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-midnight/30" />
              </>
            )}
            <div className="sm:col-span-2 flex items-center gap-3">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-midnight text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-midnight/90 transition-colors disabled:opacity-60">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving…' : 'Save'}
              </button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="flex flex-col gap-2">
        {tab === 'educators' && (educators.length === 0 ? (
          <EmptyState icon={GraduationCap} label="No educators at this campus yet" />
        ) : educators.map((e) => (
          <Row key={e.id} name={e.name} sub={e.email} onDelete={() => remove('educators', e.id)} />
        )))}
        {tab === 'principals' && (principals.length === 0 ? (
          <EmptyState icon={Users} label="No principal assigned to this campus yet" />
        ) : principals.map((p) => (
          <Row key={p.id} name={p.name} sub={p.email} onDelete={() => remove('principals', p.id)} />
        )))}
        {tab === 'students' && (students.length === 0 ? (
          <EmptyState icon={School} label="No students at this campus yet" />
        ) : students.map((s) => (
          <Row key={s.id} name={s.name} sub={`Class ${s.class}${s.section ? ` - ${s.section}` : ''}${s.isActive ? '' : ' · Inactive'}`} onDelete={() => remove('students', s.id)} />
        )))}
      </div>
    </div>
  )
}

function Row({ name, sub, onDelete }: { name: string; sub: string; onDelete: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-midnight">{name}</p>
        <p className="text-xs text-charcoal/50">{sub}</p>
      </div>
      <button onClick={onDelete} className="p-2 text-charcoal/40 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remove">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function EmptyState({ icon: Icon, label }: { icon: typeof GraduationCap; label: string }) {
  return (
    <div className="text-center py-12 text-charcoal/40">
      <Icon size={32} className="mx-auto mb-2 opacity-30" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
