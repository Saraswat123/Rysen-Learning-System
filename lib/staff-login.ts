import { NextRequest, NextResponse } from 'next/server'
import { db } from './db'
import { createSession, SESSION_COOKIE, SESSION_DURATION_MS } from './auth'
import { verifyPassword, ensurePasswordColumns } from './password'
import { verifyTurnstile } from './turnstile'
import { clientIp, rateLimit, TOO_MANY } from './rate-limit'
import { Role } from '@/app/generated/prisma/client'

type StaffLoginOptions = {
  roles: Role[]
  /** Reject when the account is tied to a different campus than the one picked on the form. */
  checkBranch: boolean
  label: string
}

const BAD_CREDENTIALS = { error: 'Incorrect email or password.' }

export async function staffLogin(req: NextRequest, { roles, checkBranch, label }: StaffLoginOptions) {
  try {
    await ensurePasswordColumns()

    const body = await req.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const ip = clientIp(req)
    const allowed = (await rateLimit(`login:ip:${ip}`, 20, 15 * 60)) && (await rateLimit(`login:email:${email}`, 8, 15 * 60))
    if (!allowed) return NextResponse.json(TOO_MANY, { status: 429 })

    const human = await verifyTurnstile(body?.turnstileToken, ip)
    if (!human) {
      return NextResponse.json({ error: 'Captcha verification failed. Please try again.' }, { status: 403 })
    }

    const user = await db.user.findUnique({ where: { email }, omit: { password: false } })
    if (!user || !roles.includes(user.role) || !user.isActive) {
      return NextResponse.json(BAD_CREDENTIALS, { status: 401 })
    }

    // Needed by the UI to route first-time users to password setup
    if (!user.password) {
      return NextResponse.json({ error: 'No password set up yet for this account.', code: 'NO_PASSWORD' }, { status: 401 })
    }

    if (!(await verifyPassword(password, user.password))) {
      return NextResponse.json(BAD_CREDENTIALS, { status: 401 })
    }

    const branchId = typeof body?.branchId === 'string' ? body.branchId : ''
    if (checkBranch && user.branchId && branchId && user.branchId !== branchId) {
      return NextResponse.json({ error: 'That campus does not match your account.' }, { status: 401 })
    }

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
    console.error(`[${label}]`, err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
