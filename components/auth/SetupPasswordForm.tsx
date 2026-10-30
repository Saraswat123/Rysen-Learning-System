'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import PasswordInput from '@/components/ui/PasswordInput'
import TurnstileWidget from '@/components/auth/TurnstileWidget'

// Two-step first-time setup: (1) name+email → emailed OTP code, (2) code +
// new password → account claimed. Replaces the old single-step flow that only
// checked name+email strings matched, which didn't prove email ownership.
export default function SetupPasswordForm({ onSuccess, extra }: { onSuccess: () => void | Promise<void>; extra?: React.ReactNode }) {
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [nameEmail, setNameEmail] = useState({ name: '', email: '' })
  const [token, setToken] = useState('')
  const [otp, setOtp] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [passwords, setPasswords] = useState({ password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/request-setup-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nameEmail, turnstileToken }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      setToken(data.token)
      setInfo(data.message)
      setStep('verify')
    } finally {
      setLoading(false)
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, otp, ...passwords }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      await onSuccess()
    } finally {
      setLoading(false)
    }
  }

  if (step === 'request') {
    return (
      <form onSubmit={requestOtp} className="flex flex-col gap-4">
        <Input label="Full Name" placeholder="As registered by admin"
          value={nameEmail.name} onChange={(e) => setNameEmail((f) => ({ ...f, name: e.target.value }))} required />
        <Input label="Email Address" type="email" placeholder="your@email.com"
          value={nameEmail.email} onChange={(e) => setNameEmail((f) => ({ ...f, email: e.target.value }))} required />
        <TurnstileWidget onVerify={setTurnstileToken} />
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <Button type="submit" loading={loading} size="lg" className="mt-2">Send Verification Code</Button>
      </form>
    )
  }

  return (
    <form onSubmit={submitOtp} className="flex flex-col gap-4">
      {info && <p className="text-sm text-forest bg-forest/5 px-3 py-2 rounded-lg">{info}</p>}
      <Input label="Verification Code" placeholder="6-digit code from your email"
        value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength={6} />
      <PasswordInput label="New Password" placeholder="At least 6 characters"
        value={passwords.password} onChange={(e) => setPasswords((f) => ({ ...f, password: e.target.value }))} required minLength={6} />
      <PasswordInput label="Confirm Password" placeholder="Re-enter password"
        value={passwords.confirmPassword} onChange={(e) => setPasswords((f) => ({ ...f, confirmPassword: e.target.value }))} required minLength={6} />
      {extra}
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      <Button type="submit" loading={loading} size="lg" className="mt-2">Set Password & Sign In</Button>
      <button type="button" onClick={() => { setStep('request'); setError(''); setOtp('') }}
        className="text-xs text-charcoal/50 hover:text-midnight text-center">
        Didn't get a code? Go back
      </button>
    </form>
  )
}
