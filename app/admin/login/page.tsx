'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RysenLogo from '@/components/RysenLogo'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

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
    <div className="min-h-screen flex items-center justify-center bg-midnight">
      <div className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="flex items-center gap-4">
            <RysenLogo size="md" light />
            <div className="text-left">
              <p className="text-white font-bold text-base leading-tight">Rysen Group of Schools</p>
              <p className="text-gold text-xs font-semibold tracking-wide mt-0.5">Run by IITians and Doctors</p>
            </div>
          </div>
          <p className="text-white/40 text-xs tracking-widest uppercase">Admin Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-xl font-bold text-midnight mb-1">Admin Sign In</h1>
          <p className="text-sm text-charcoal/60 mb-6">Enter your registered name and email</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Full Name"
              placeholder="Admin name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="admin@rysen.edu.in"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />

            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <Button type="submit" loading={loading} size="lg" className="mt-2">
              Sign In to Admin
            </Button>
          </form>
        </div>

        <p className="text-center mt-4">
          <a href="/login" className="text-xs text-white/30 hover:text-white/60">
            ← Educator Login
          </a>
        </p>
      </div>
    </div>
  )
}
