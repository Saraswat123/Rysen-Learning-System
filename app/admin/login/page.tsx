'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RysenLogo from '@/components/RysenLogo'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import PasswordInput from '@/components/ui/PasswordInput'
import { ShieldCheck, KeyRound, UserPlus } from 'lucide-react'

export default function AdminLogin() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'setup'>('signin')
  const [signinForm, setSigninForm] = useState({ email: '', password: '' })
  const [setupForm, setSetupForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signinForm),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'NO_PASSWORD') {
          setMode('setup')
          setSetupForm((f) => ({ ...f, email: signinForm.email }))
          setError('No password set up yet — create one below.')
        } else {
          setError(data.error)
        }
        return
      }
      router.push('/admin/dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setupForm),
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
            {/* Mode toggle */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
              <button onClick={() => { setMode('signin'); setError('') }}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${mode === 'signin' ? 'bg-white text-midnight shadow-sm' : 'text-charcoal/50 hover:text-midnight'}`}>
                <KeyRound size={12} /> Sign In
              </button>
              <button onClick={() => { setMode('setup'); setError('') }}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${mode === 'setup' ? 'bg-white text-midnight shadow-sm' : 'text-charcoal/50 hover:text-midnight'}`}>
                <UserPlus size={12} /> First-time Setup
              </button>
            </div>

            {mode === 'signin' ? (
              <>
                <h1 className="text-2xl font-bold text-midnight mb-1">Admin Login</h1>
                <p className="text-sm text-charcoal/60 mb-6">Sign in with your email and password</p>

                <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                  <Input label="Email Address" type="email" placeholder="admin@rysengroup.com"
                    value={signinForm.email} onChange={(e) => setSigninForm((f) => ({ ...f, email: e.target.value }))} required />
                  <PasswordInput label="Password" placeholder="••••••••"
                    value={signinForm.password} onChange={(e) => setSigninForm((f) => ({ ...f, password: e.target.value }))} required />

                  {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

                  <Button type="submit" loading={loading} size="lg" className="mt-2">Sign In</Button>
                </form>

                <p className="text-xs text-center text-charcoal/50 mt-4">
                  First time logging in?{' '}
                  <button onClick={() => { setMode('setup'); setError('') }} className="text-midnight font-semibold hover:underline">
                    Set up your password
                  </button>
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-midnight mb-1">Set Up Your Password</h1>
                <p className="text-sm text-charcoal/60 mb-6">Verify your admin account, then choose a password</p>

                <form onSubmit={handleSetup} className="flex flex-col gap-4">
                  <Input label="Full Name" placeholder="Your registered admin name"
                    value={setupForm.name} onChange={(e) => setSetupForm((f) => ({ ...f, name: e.target.value }))} required />
                  <Input label="Email Address" type="email" placeholder="admin@rysengroup.com"
                    value={setupForm.email} onChange={(e) => setSetupForm((f) => ({ ...f, email: e.target.value }))} required />
                  <PasswordInput label="New Password" placeholder="At least 6 characters"
                    value={setupForm.password} onChange={(e) => setSetupForm((f) => ({ ...f, password: e.target.value }))} required minLength={6} />
                  <PasswordInput label="Confirm Password" placeholder="Re-enter password"
                    value={setupForm.confirmPassword} onChange={(e) => setSetupForm((f) => ({ ...f, confirmPassword: e.target.value }))} required minLength={6} />

                  {error && <p className={`text-sm px-3 py-2 rounded-lg ${error.includes('below') ? 'text-amber-700 bg-amber-50' : 'text-red-600 bg-red-50'}`}>{error}</p>}

                  <Button type="submit" loading={loading} size="lg" className="mt-2">Set Password & Sign In</Button>
                </form>

                <p className="text-xs text-center text-charcoal/50 mt-4">
                  Already set up?{' '}
                  <button onClick={() => { setMode('signin'); setError('') }} className="text-midnight font-semibold hover:underline">
                    Sign in instead
                  </button>
                </p>
              </>
            )}

            <p className="text-xs text-center text-charcoal/50 mt-4 pt-4 border-t border-gray-100">
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
