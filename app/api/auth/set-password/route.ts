export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, SESSION_COOKIE, SESSION_DURATION_MS } from '@/lib/auth'
import { hashPassword, ensurePasswordColumns, MIN_PASSWORD_LENGTH } from '@/lib/password'
import { Role } from '@/app/generated/prisma/client'

// One-time account claim: verifies name+email match an admin-created account,
// then lets that person set the password they'll use for every future login.
export async function POST(req: NextRequest) {
  try {
    await ensurePasswordColumns()

    const { name, email, password, confirmPassword } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })

    if (!user || !user.isActive || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN && user.role !== Role.EDUCATOR)) {
      return NextResponse.json({ error: 'Account not found. Contact your admin.' }, { status: 401 })
    }
    if (user.name.toLowerCase().trim() !== name.toLowerCase().trim()) {
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
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
