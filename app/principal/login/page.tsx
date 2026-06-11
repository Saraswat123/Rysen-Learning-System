'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import RysenLogo from '@/components/RysenLogo'

interface Branch { id: string; name: string; location: string }

export default function PrincipalLoginPage() {
  const router = useRouter()
  const [branches, setBranches] = useState<Branch[]>([])
  const [form, setForm] = useState({ name: '', email: '', branchId: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/branches').then((r) => r.json()).then(setBranches)
  }, [])

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
    router.push('/principal/dashboard')
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4"><RysenLogo /></div>
          <h1 className="text-2xl font-bold text-midnight">Principal Portal</h1>
          <p className="text-sm text-charcoal/60 mt-1">Sign in to your leadership dashboard</p>
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
