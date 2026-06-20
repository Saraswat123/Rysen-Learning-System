'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import RysenLogo from '@/components/RysenLogo'
import { Layers, CheckCircle, BookOpen } from 'lucide-react'

interface Branch { id: string; name: string; location: string }
interface Program { id: string; name: string; description: string | null; applicableTo: string; _count: { stages: number } }

const PROG_COLORS = ['#033D4C', '#225632', '#7D783E', '#40403E', '#5B4D8A']

export default function PrincipalLoginPage() {
  const router = useRouter()
  const [branches, setBranches] = useState<Branch[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [form, setForm] = useState({ name: '', email: '', branchId: '' })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/branches').then((r) => r.json()).then(setBranches).catch(() => {})
    fetch('/api/programs?published=true').then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) {
        const filtered = d.filter((p: Program) => p.applicableTo === 'BOTH' || p.applicableTo === 'PRINCIPAL')
        setPrograms(filtered)
        if (filtered.length === 1) setSelectedIds(new Set([filtered[0].id]))
      }
    }).catch(() => {})
  }, [])

  function toggleProgram(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() { setSelectedIds(new Set(programs.map((p) => p.id))) }
  function clearAll() { setSelectedIds(new Set()) }
  const allSelected = programs.length > 0 && selectedIds.size === programs.length

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/principal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    await Promise.all(
      [...selectedIds].map((id) =>
        fetch(`/api/programs/${id}/enroll`, { method: 'POST' }).catch(() => {})
      )
    )
    router.push('/principal/dashboard')
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 gap-2">
          <div className="flex items-center gap-3">
            <RysenLogo size="sm" />
            <div className="text-left">
              <p className="text-midnight font-bold text-sm leading-tight">Rysen Group of Schools</p>
              <p className="text-olive text-xs font-medium">Run by IITians and Doctors</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-midnight mt-2">Principal Portal</h1>
          <p className="text-sm text-charcoal/60">Sign in to your leadership dashboard</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-2 bg-olive/10 border border-olive/20 rounded-xl px-4 py-2.5 mb-6">
            <span className="text-lg">🏫</span>
            <span className="text-sm font-medium text-olive">Principal / Center Head Access</span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input label="Full Name" placeholder="Your name" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            <Input label="Email Address" type="email" placeholder="principal@rysen.edu.in"
              value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-charcoal">Campus</label>
              <select value={form.branchId}
                onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive text-sm">
                <option value="">Select your campus</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.location}</option>)}
              </select>
            </div>

            {programs.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-charcoal">Select Training Program(s)</label>
                  <button type="button" onClick={allSelected ? clearAll : selectAll}
                    className="text-xs font-semibold text-olive underline underline-offset-2 hover:text-forest transition-colors">
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {programs.map((p, i) => {
                    const selected = selectedIds.has(p.id)
                    return (
                      <button key={p.id} type="button" onClick={() => toggleProgram(p.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${selected ? 'border-olive bg-olive/5' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: PROG_COLORS[i % PROG_COLORS.length] }}>
                          <Layers size={15} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-midnight">{p.name}</p>
                          {p.description && <p className="text-xs text-charcoal/50 truncate">{p.description}</p>}
                          <p className="text-xs text-charcoal/40 mt-0.5 flex items-center gap-1">
                            <BookOpen size={10} /> {p._count.stages} stages
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? 'border-olive bg-olive' : 'border-gray-300'}`}>
                          {selected && <CheckCircle size={14} className="text-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
                {selectedIds.size > 0 && (
                  <p className="text-xs text-forest font-medium">{selectedIds.size} program{selectedIds.size > 1 ? 's' : ''} selected</p>
                )}
              </div>
            )}

            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <Button type="submit" loading={loading} className="w-full mt-2" style={{ backgroundColor: '#7D783E' }}>
              Sign In to Portal
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100 flex justify-center gap-4 text-xs text-charcoal/40">
            <a href="/login" className="hover:text-midnight">Educator Login</a>
            <span>·</span>
            <a href="/admin/login" className="hover:text-midnight">Admin Login</a>
          </div>
        </div>
      </div>
    </div>
  )
}
