export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, SESSION_COOKIE, SESSION_DURATION_MS } from '@/lib/auth'
import { verifyPassword, ensurePasswordColumns } from '@/lib/password'
import { Role } from '@/app/generated/prisma/client'

export async function POST(req: NextRequest) {
  try {
    await ensurePasswordColumns()

    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })

    if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) || !user.isActive) {
      return NextResponse.json({ error: 'Admin account not found.' }, { status: 401 })
    }

    if (!user.password) {
      return NextResponse.json({ error: 'No password set up yet for this account.', code: 'NO_PASSWORD' }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
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
    console.error('[admin-login]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
