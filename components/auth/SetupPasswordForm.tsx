'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import PasswordInput from '@/components/ui/PasswordInput'
import TurnstileWidget from '@/components/auth/TurnstileWidget'

// First-time setup uses the admin-registered name and email, then sets a password.
export default function SetupPasswordForm({ onSuccess, extra }: { onSuccess: () => void | Promise<void>; extra?: React.ReactNode }) {
  const [nameEmail, setNameEmail] = useState({ name: '', email: '' })
  const [turnstileToken, setTurnstileToken] = useState('')
  const [captchaKey, setCaptchaKey] = useState(0)
  const [passwords, setPasswords] = useState({ password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submitSetup(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nameEmail, ...passwords, turnstileToken }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data) {
        setError(data?.error ?? 'Something went wrong.')
        setTurnstileToken('')
        setCaptchaKey((k) => k + 1)
        return
      }
      await onSuccess()
    } catch {
      setError('Network error. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submitSetup} className="flex flex-col gap-4">
      <Input label="Full Name" placeholder="As registered by admin"
        value={nameEmail.name} onChange={(e) => setNameEmail((f) => ({ ...f, name: e.target.value }))} required />
      <Input label="Email Address" type="email" placeholder="your@email.com"
        value={nameEmail.email} onChange={(e) => setNameEmail((f) => ({ ...f, email: e.target.value }))} required />
      <PasswordInput label="New Password" placeholder="At least 6 characters"
        value={passwords.password} onChange={(e) => setPasswords((f) => ({ ...f, password: e.target.value }))} required minLength={6} />
      <PasswordInput label="Confirm Password" placeholder="Re-enter password"
        value={passwords.confirmPassword} onChange={(e) => setPasswords((f) => ({ ...f, confirmPassword: e.target.value }))} required minLength={6} />
      <TurnstileWidget key={captchaKey} onVerify={setTurnstileToken} />
      {extra}
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      <Button type="submit" loading={loading} size="lg" className="mt-2">Set Password & Sign In</Button>
    </form>
  )
}
