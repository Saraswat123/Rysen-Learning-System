import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, SESSION_COOKIE, SESSION_DURATION_MS } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function POST(req: NextRequest) {
  const { name, email } = await req.json()

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })

  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) || !user.isActive) {
    return NextResponse.json({ error: 'Admin account not found.' }, { status: 401 })
  }

  if (user.name.toLowerCase() !== name.toLowerCase().trim()) {
    return NextResponse.json({ error: 'Name does not match.' }, { status: 401 })
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
}
