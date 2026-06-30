export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { deleteStudentSession, STUDENT_SESSION_COOKIE } from '@/lib/student-auth'

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get(STUDENT_SESSION_COOKIE)?.value
  if (token) await deleteStudentSession(token)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(STUDENT_SESSION_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
