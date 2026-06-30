'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import RysenLogo from '@/components/RysenLogo'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Layers, CheckCircle, BookOpen } from 'lucide-react'

interface Branch { id: string; name: string; location: string }
interface Program { id: string; name: string; description: string | null; applicableTo: string; isPublished: boolean; _count: { stages: number } }

const PROG_COLORS = ['#033D4C', '#225632', '#7D783E', '#40403E', '#5B4D8A']

export default function EducatorLogin() {
  const router = useRouter()
  const [branches, setBranches] = useState<Branch[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [form, setForm] = useState({ name: '', email: '', branchId: '' })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/branches').then((r) => r.json()).then(setBranches).catch(() => {})
    fetch('/api/programs').then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) {
        const filtered = d.filter((p: Program) => p.applicableTo === 'BOTH' || p.applicableTo === 'EDUCATOR')
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

  function selectAll() {
    setSelectedIds(new Set(programs.map((p) => p.id)))
  }

  function clearAll() {
    setSelectedIds(new Set())
  }

  const allSelected = programs.length > 0 && selectedIds.size === programs.length

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      // Enroll in all selected programs
      await Promise.all(
        [...selectedIds].map((id) =>
          fetch(`/api/programs/${id}/enroll`, { method: 'POST' }).catch(() => {})
        )
      )
      router.push('/educator/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const locationGroups = branches.reduce<Record<string, Branch[]>>((acc, b) => {
    acc[b.location] = [...(acc[b.location] ?? []), b]
    return acc
  }, {})

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 bg-midnight p-12 text-white">
        <div className="flex items-center gap-4">
          <RysenLogo size="md" light />
          <div>
            <p className="text-white font-bold text-base leading-tight">Rysen Group of Schools</p>
            <p className="text-gold text-xs font-semibold tracking-wide mt-0.5">Run by IITians and Doctors</p>
          </div>
        </div>

        {programs.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">Active Programs</p>
            {programs.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: PROG_COLORS[i % PROG_COLORS.length] }}>
                  <Layers size={14} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{p.name}</p>
                  <p className="text-xs text-white/40 flex items-center gap-1">
                    <BookOpen size={10} /> {p._count.stages > 0 ? `${p._count.stages} stages` : 'Coming soon'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <h2 className="text-3xl font-bold leading-snug mb-4">
            Every great teacher<br />
            <span className="text-gold">never stops learning.</span>
          </h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Welcome to the RYSEN Learning Centre — your professional development hub.
          </p>
        </div>
        <div className="text-white/40 text-xs">RYSEN Group of Schools · Rise To Success</div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center bg-cream p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <RysenLogo size="sm" />
            <div>
              <p className="text-midnight font-bold text-sm leading-tight">Rysen Group of Schools</p>
              <p className="text-olive text-xs font-medium">Run by IITians and Doctors</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h1 className="text-2xl font-bold text-midnight mb-1">Educator Login</h1>
            <p className="text-sm text-charcoal/60 mb-6">Sign in to continue your PD journey</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input label="Full Name" placeholder="As registered by admin"
                value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              <Input label="Email Address" type="email" placeholder="your@email.com"
                value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-charcoal">Campus / Branch</label>
                <select required value={form.branchId}
                  onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-midnight">
                  <option value="">Select your campus</option>
                  {Object.entries(locationGroups).map(([loc, bs]) => (
                    <optgroup key={loc} label={loc}>
                      {bs.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Multi-select Program Cards */}
              {programs.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-charcoal">Select Training Program(s)</label>
                    <button type="button" onClick={allSelected ? clearAll : selectAll}
                      className="text-xs font-semibold text-midnight underline underline-offset-2 hover:text-forest transition-colors">
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {programs.map((p, i) => {
                      const selected = selectedIds.has(p.id)
                      return (
                        <button key={p.id} type="button" onClick={() => toggleProgram(p.id)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${selected ? 'border-midnight bg-midnight/5' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: PROG_COLORS[i % PROG_COLORS.length] }}>
                            <Layers size={15} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-midnight">{p.name}</p>
                              {!p.isPublished && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Coming Soon</span>}
                            </div>
                            {p.description && <p className="text-xs text-charcoal/50 truncate">{p.description}</p>}
                            <p className="text-xs text-charcoal/40 mt-0.5 flex items-center gap-1">
                              <BookOpen size={10} /> {p._count.stages > 0 ? `${p._count.stages} stages` : 'Stages coming soon'}
                            </p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? 'border-midnight bg-midnight' : 'border-gray-300'}`}>
                            {selected && <CheckCircle size={14} className="text-white" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  {selectedIds.size === 0 && (
                    <p className="text-xs text-amber-600">Select at least one program to join</p>
                  )}
                  {selectedIds.size > 0 && (
                    <p className="text-xs text-forest font-medium">{selectedIds.size} program{selectedIds.size > 1 ? 's' : ''} selected</p>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <Button type="submit" loading={loading} size="lg" className="mt-2">Sign In</Button>
            </form>

            <p className="text-xs text-center text-charcoal/50 mt-6">
              Not registered? <span className="text-midnight font-medium">Contact your Campus Head or Admin.</span>
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
            <a href="/student/login" className="text-xs text-charcoal/40 hover:text-midnight">Student Portal →</a>
            <span className="text-charcoal/20 text-xs">|</span>
            <a href="/principal/login" className="text-xs text-charcoal/40 hover:text-midnight">Principal / Center Head Login →</a>
            <span className="text-charcoal/20 text-xs">|</span>
            <a href="/admin/login" className="text-xs text-charcoal/40 hover:text-midnight">Admin Login →</a>
          </div>
        </div>
      </div>
    </div>
  )
}
