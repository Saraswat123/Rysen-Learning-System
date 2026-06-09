import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, SESSION_COOKIE, SESSION_DURATION_MS } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function POST(req: NextRequest) {
  const { name, email, branchId } = await req.json()

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })

  if (!user || user.role !== Role.EDUCATOR || !user.isActive) {
    return NextResponse.json({ error: 'Account not found. Contact your admin.' }, { status: 401 })
  }

  // If educator has an assigned branch, verify it matches
  if (user.branchId && branchId && user.branchId !== branchId) {
    return NextResponse.json({ error: 'Branch does not match your account.' }, { status: 401 })
  }

  // If educator has a branch but none selected, auto-assign their branch
  if (user.branchId && !branchId) {
    // allow login — branch already set
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
