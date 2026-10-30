export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, SESSION_COOKIE, SESSION_DURATION_MS } from '@/lib/auth'
import { hashPassword, ensurePasswordColumns, MIN_PASSWORD_LENGTH } from '@/lib/password'
import { verifySetupToken } from '@/lib/account-setup-otp'
import { Role } from '@/app/generated/prisma/client'

// Step 2 of first-time account claim — requires the emailed OTP code to have
// been verified (via /api/auth/request-setup-otp's token), proving the
// requester owns the account's email, before letting them set a password.
export async function POST(req: NextRequest) {
  try {
    await ensurePasswordColumns()

    const { token: setupToken, otp, password, confirmPassword } = await req.json()

    if (!setupToken || !otp || !password) {
      return NextResponse.json({ error: 'Verification code and password are required' }, { status: 400 })
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 })
    }

    const claim = await verifySetupToken(setupToken, otp)
    if (!claim) {
      return NextResponse.json({ error: 'Invalid or expired verification code. Request a new one.' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { id: claim.uid }, omit: { password: false } })

    if (!user || !user.isActive || user.email.toLowerCase() !== claim.email
      || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN && user.role !== Role.EDUCATOR && user.role !== Role.PRINCIPAL)) {
      return NextResponse.json({ error: 'Account not found. Contact your admin.' }, { status: 401 })
    }
    if (user.password) {
      return NextResponse.json({ error: 'Password already set up for this account. Use Sign In, or ask your admin to reset it.' }, { status: 409 })
    }

    const hashed = await hashPassword(password)
    await db.user.update({
      where: { id: user.id },
      data: { password: hashed, passwordSetAt: new Date() },
    })

    const token = await createSession(user.id)
    const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } })
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_MS / 1000,
      path: '/',
    })
    return res
  } catch (err) {
    console.error('[set-password]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
