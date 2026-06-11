'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import RysenLogo from '@/components/RysenLogo'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface Branch {
  id: string
  name: string
  location: string
}

export default function EducatorLogin() {
  const router = useRouter()
  const [branches, setBranches] = useState<Branch[]>([])
  const [form, setForm] = useState({ name: '', email: '', branchId: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/branches').then((r) => r.json()).then(setBranches)
  }, [])

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
        <RysenLogo size="lg" light />
        <div>
          <h2 className="text-3xl font-bold leading-snug mb-4">
            Every great teacher<br />
            <span className="text-gold">never stops learning.</span>
          </h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Welcome to the RYSEN Learning Centre — your professional development hub.
            Complete your 5-stage journey and earn your RLC certification.
          </p>
        </div>
        <div className="text-white/40 text-xs">
          RYSEN Group of Schools · Rise To Success
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center bg-cream p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <RysenLogo size="md" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h1 className="text-2xl font-bold text-midnight mb-1">Educator Login</h1>
            <p className="text-sm text-charcoal/60 mb-6">Sign in to continue your PD journey</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Full Name"
                placeholder="As registered by admin"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
              <Input
                label="Email Address"
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-charcoal">Campus / Branch</label>
                <select
                  required
                  value={form.branchId}
                  onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-midnight"
                >
                  <option value="">Select your campus</option>
                  {Object.entries(locationGroups).map(([loc, bs]) => (
                    <optgroup key={loc} label={loc}>
                      {bs.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <Button type="submit" loading={loading} size="lg" className="mt-2">
                Sign In
              </Button>
            </form>

            <p className="text-xs text-center text-charcoal/50 mt-6">
              Not registered?{' '}
              <span className="text-midnight font-medium">Contact your Campus Head or Admin.</span>
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 mt-4">
            <a href="/principal/login" className="text-xs text-charcoal/40 hover:text-midnight">
              Principal / Center Head Login →
            </a>
            <span className="text-charcoal/20 text-xs">|</span>
            <a href="/admin/login" className="text-xs text-charcoal/40 hover:text-midnight">
              Admin Login →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
