'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import RysenLogo from '@/components/RysenLogo'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface Branch { id: string; name: string; location: string }

export default function StudentLoginPage() {
  const router = useRouter()
  const [branches, setBranches] = useState<Branch[]>([])
  const [form, setForm] = useState({ name: '', class: '', section: '', branchId: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/branches').then((r) => r.json()).then(setBranches).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push('/student/dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-cream">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 bg-midnight p-12 text-white">
        <div className="flex items-center gap-4">
          <RysenLogo size="md" light />
          <div>
            <p className="text-white font-bold text-base leading-tight">Rysen Group of Schools</p>
            <p className="text-gold text-xs font-semibold tracking-wide mt-0.5">Run by IITians and Doctors</p>
          </div>
        </div>

        <div>
          <div className="text-6xl mb-6">🎓</div>
          <h2 className="text-3xl font-bold leading-snug mb-4">
            Test your knowledge,<br />
            <span className="text-gold">rise to the top.</span>
          </h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Welcome to the RYSEN Student Portal. Take tests, track your scores, and compete with your classmates.
          </p>
        </div>

        <div className="text-white/40 text-xs">RYSEN Group of Schools · Rise To Success</div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <RysenLogo size="sm" />
            <div>
              <p className="text-midnight font-bold text-sm leading-tight">Rysen Group of Schools</p>
              <p className="text-olive text-xs font-medium">Run by IITians and Doctors</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h1 className="text-2xl font-bold text-midnight mb-1">Student Login</h1>
            <p className="text-sm text-charcoal/60 mb-6">Enter your details to access your tests</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Full Name"
                placeholder="As registered by your teacher"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Class"
                  placeholder="e.g. 10"
                  value={form.class}
                  onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}
                  required
                />
                <Input
                  label="Section"
                  placeholder="e.g. A"
                  value={form.section}
                  onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-charcoal">School / Branch</label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-charcoal bg-white text-sm focus:outline-none focus:ring-2 focus:ring-midnight">
                  <option value="">Select your school</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.location}</option>)}
                </select>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <Button type="submit" loading={loading} size="lg" className="mt-2">Enter Portal</Button>
            </form>

            <p className="text-xs text-center text-charcoal/50 mt-6">
              Not registered? <span className="text-midnight font-medium">Ask your teacher to add you.</span>
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 mt-4">
            <a href="/login" className="text-xs text-charcoal/40 hover:text-midnight">Educator Login →</a>
            <span className="text-charcoal/20 text-xs">|</span>
            <a href="/admin/login" className="text-xs text-charcoal/40 hover:text-midnight">Admin Login →</a>
          </div>
        </div>
      </div>
    </div>
  )
}
