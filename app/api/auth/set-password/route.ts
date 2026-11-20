export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, SESSION_COOKIE, SESSION_DURATION_MS } from '@/lib/auth'
import { hashPassword, ensurePasswordColumns, MIN_PASSWORD_LENGTH } from '@/lib/password'
import { Role } from '@/app/generated/prisma/client'
import { clientIp, rateLimit, TOO_MANY } from '@/lib/rate-limit'
import crypto from 'crypto'
import { verifyTurnstile } from '@/lib/turnstile'

// First-time setup: match the admin-created account by name and email, then
// set its password. Turnstile and per-IP/per-email rate limits reduce abuse.
export async function POST(req: NextRequest) {
  try {
    await ensurePasswordColumns()

    const { name, email, password, confirmPassword, turnstileToken } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 })
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    const ip = clientIp(req)
    const human = await verifyTurnstile(turnstileToken, ip)
    if (!human) {
      return NextResponse.json({ error: 'Captcha verification failed. Please try again.' }, { status: 403 })
    }

    const emailKey = crypto.createHash('sha256').update(normalizedEmail).digest('hex')
    const allowed = (await rateLimit(`set-password:ip:${ip}`, 20, 15 * 60)) && (await rateLimit(`set-password:email:${emailKey}`, 5, 60 * 60))
    if (!allowed) return NextResponse.json(TOO_MANY, { status: 429 })

    const user = await db.user.findUnique({ where: { email: normalizedEmail }, omit: { password: false } })

    if (!user || !user.isActive
      || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN && user.role !== Role.EDUCATOR && user.role !== Role.PRINCIPAL)) {
      return NextResponse.json({ error: 'Account not found. Contact your admin.' }, { status: 401 })
    }
    if (user.name.toLowerCase().trim() !== String(name).toLowerCase().trim()) {
      return NextResponse.json({ error: 'Name does not match our records.' }, { status: 401 })
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
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
