'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import RysenLogo from '@/components/RysenLogo'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Layers, CheckCircle, BookOpen, ChevronDown, X, ArrowRight } from 'lucide-react'

interface Branch { id: string; name: string; location: string }
interface Program { id: string; name: string; description: string | null; applicableTo: string; isPublished: boolean; _count: { stages: number } }

const PROG_COLORS = ['#033D4C', '#225632', '#7D783E', '#40403E', '#5B4D8A']

export default function EducatorLogin() {
  const router = useRouter()
  const [branches, setBranches] = useState<Branch[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [form, setForm] = useState({ name: '', email: '', branchId: '' })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/branches').then((r) => r.json()).then(setBranches).catch(() => {})
    fetch('/api/programs').then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) {
        const filtered = d.filter((p: Program) => p.applicableTo === 'BOTH' || p.applicableTo === 'EDUCATOR')
        setPrograms(filtered)
      }
    }).catch(() => {})
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function toggleProgram(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function clearAll() { setSelectedIds(new Set()) }

  async function submit(skipPrograms = false) {
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
      if (!skipPrograms && selectedIds.size > 0) {
        await Promise.all(
          [...selectedIds].map((id) =>
            fetch(`/api/programs/${id}/enroll`, { method: 'POST' }).catch(() => {})
          )
        )
      }
      router.push('/educator/dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await submit(false)
  }

  const locationGroups = branches.reduce<Record<string, Branch[]>>((acc, b) => {
    acc[b.location] = [...(acc[b.location] ?? []), b]
    return acc
  }, {})

  const selectedPrograms = programs.filter((p) => selectedIds.has(p.id))
  const dropdownLabel = selectedIds.size === 0
    ? 'Select programs (optional)'
    : selectedIds.size === 1
      ? selectedPrograms[0]?.name
      : `${selectedIds.size} programs selected`

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
            <RysenLogo size="md" />
            <div>
              <p className="text-midnight font-bold text-base leading-tight">Rysen Group of Schools</p>
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-midnight text-sm">
                  <option value="">Select your campus</option>
                  {Object.entries(locationGroups).map(([loc, bs]) => (
                    <optgroup key={loc} label={loc}>
                      {bs.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Program multi-select dropdown */}
              {programs.length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-charcoal">
                      Training Program <span className="text-charcoal/40 font-normal">(optional)</span>
                    </label>
                    {selectedIds.size > 0 && (
                      <button type="button" onClick={clearAll}
                        className="text-xs text-charcoal/40 hover:text-charcoal flex items-center gap-1 transition-colors">
                        <X size={11} /> Clear
                      </button>
                    )}
                  </div>

                  {/* Dropdown trigger */}
                  <div ref={dropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setDropdownOpen((v) => !v)}
                      className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white hover:border-midnight/40 focus:outline-none focus:ring-2 focus:ring-midnight transition-colors"
                    >
                      <span className={selectedIds.size === 0 ? 'text-charcoal/40' : 'text-charcoal font-medium'}>
                        {dropdownLabel}
                      </span>
                      <ChevronDown size={15} className={`text-charcoal/40 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {dropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                        {programs.map((p, i) => {
                          const selected = selectedIds.has(p.id)
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggleProgram(p.id)}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${selected ? 'bg-midnight/3' : ''}`}
                            >
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: PROG_COLORS[i % PROG_COLORS.length] }}>
                                <Layers size={12} className="text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-midnight truncate">{p.name}</p>
                                <p className="text-xs text-charcoal/40">
                                  {p._count.stages > 0 ? `${p._count.stages} stages` : 'Coming soon'}
                                  {!p.isPublished && ' · Coming Soon'}
                                </p>
                              </div>
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? 'border-midnight bg-midnight' : 'border-gray-300'}`}>
                                {selected && <CheckCircle size={10} className="text-white" />}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {selectedIds.size > 0 && (
                    <p className="text-xs text-forest font-medium">{selectedIds.size} program{selectedIds.size > 1 ? 's' : ''} selected — will enroll on sign in</p>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <Button type="submit" loading={loading} size="lg" className="mt-2">Sign In</Button>
            </form>

            {/* Skip programs — go straight to tasks */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => submit(true)}
                disabled={loading || !form.name || !form.email || !form.branchId}
                className="w-full flex items-center justify-center gap-2 text-sm text-charcoal/50 hover:text-midnight transition-colors py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Skip training — go to Task Dashboard
                <ArrowRight size={14} />
              </button>
              <p className="text-xs text-center text-charcoal/30 mt-1">Fill name, email and campus above first</p>
            </div>

            <p className="text-xs text-center text-charcoal/50 mt-4">
              Not registered? <span className="text-midnight font-medium">Contact your Campus Head or Admin.</span>
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 mt-5 flex-wrap">
            <a href="/student/login" className="text-sm font-semibold text-midnight/70 hover:text-midnight transition-colors">Student Portal →</a>
            <span className="text-charcoal/30 text-sm">|</span>
            <a href="/principal/login" className="text-sm font-semibold text-midnight/70 hover:text-midnight transition-colors">Principal Login →</a>
            <span className="text-charcoal/30 text-sm">|</span>
            <a href="/admin/login" className="text-sm font-semibold text-midnight/70 hover:text-midnight transition-colors">Admin Login →</a>
          </div>
        </div>
      </div>
    </div>
  )
}
