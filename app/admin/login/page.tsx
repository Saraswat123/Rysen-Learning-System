'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RysenLogo from '@/components/RysenLogo'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { ShieldCheck } from 'lucide-react'

export default function AdminLogin() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push('/admin/dashboard')
    } finally {
      setLoading(false)
    }
  }

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

        <div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
            <ShieldCheck size={24} className="text-gold" />
          </div>
          <h2 className="text-3xl font-bold leading-snug mb-4">
            Manage the entire<br />
            <span className="text-gold">RYSEN network.</span>
          </h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Admin portal for managing educators, programs, student tests, tasks, and all 15 campuses from one place.
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
            <h1 className="text-2xl font-bold text-midnight mb-1">Admin Login</h1>
            <p className="text-sm text-charcoal/60 mb-6">Sign in to manage the RYSEN portal</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Full Name"
                placeholder="Your registered admin name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
              <Input
                label="Email Address"
                type="email"
                placeholder="admin@rysengroup.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <Button type="submit" loading={loading} size="lg" className="mt-2">Sign In</Button>
            </form>

            <p className="text-xs text-center text-charcoal/50 mt-6">
              Access restricted to <span className="text-midnight font-medium">RYSEN Admin accounts only.</span>
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 mt-5 flex-wrap">
            <a href="/login" className="text-sm font-semibold text-midnight/70 hover:text-midnight transition-colors">Educator Login →</a>
            <span className="text-charcoal/30 text-sm">|</span>
            <a href="/principal/login" className="text-sm font-semibold text-midnight/70 hover:text-midnight transition-colors">Principal Login →</a>
            <span className="text-charcoal/30 text-sm">|</span>
            <a href="/student/login" className="text-sm font-semibold text-midnight/70 hover:text-midnight transition-colors">Student Portal →</a>
          </div>
        </div>
      </div>
    </div>
  )
}
