export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createStudentSession, STUDENT_SESSION_COOKIE } from '@/lib/student-auth'
import { verifyTurnstile } from '@/lib/turnstile'
import { verifyPassword } from '@/lib/password'
import { clientIp, rateLimit, TOO_MANY } from '@/lib/rate-limit'
import { ensureRuntimeSchema } from '@/lib/schema-heal'

// One message for "no such student" and "wrong PIN" so the endpoint can't be
// used to enumerate which students exist.
const NO_MATCH = { error: 'Those details do not match our records. Check with your teacher.' }

export async function POST(req: NextRequest) {
  try {
    await ensureRuntimeSchema()
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const { name, class: cls, section, branchId, pin, turnstileToken } = body as Record<string, unknown>
    if (typeof name !== 'string' || typeof cls !== 'string' || !name.trim() || !cls.trim()) {
      return NextResponse.json({ error: 'Name and class required' }, { status: 400 })
    }

    const normalizedName = name.trim().replace(/\s+/g, ' ')
    const ip = clientIp(req)
    const identity = `${normalizedName.toLowerCase()}|${cls.trim().toLowerCase()}|${typeof branchId === 'string' ? branchId : ''}`
    const allowed = (await rateLimit(`student-login:ip:${ip}`, 30, 15 * 60))
      && (await rateLimit(`student-login:id:${identity}`, 10, 15 * 60))
    if (!allowed) return NextResponse.json(TOO_MANY, { status: 429 })

    const human = await verifyTurnstile(typeof turnstileToken === 'string' ? turnstileToken : undefined, ip)
    if (!human) {
      return NextResponse.json({ error: 'Captcha verification failed. Please try again.' }, { status: 403 })
    }

    const student = await db.student.findFirst({
      where: {
        name: { equals: normalizedName, mode: 'insensitive' },
        class: { equals: cls.trim(), mode: 'insensitive' },
        ...(typeof section === 'string' && section.trim() ? { section: { equals: section.trim(), mode: 'insensitive' } } : {}),
        ...(typeof branchId === 'string' && branchId ? { branchId } : {}),
        isActive: true,
      },
      include: { branch: true },
      omit: { pinHash: false },
    })

    if (!student) return NextResponse.json(NO_MATCH, { status: 401 })

    // PINs are opt-in per student: once an educator sets one, it is required.
    if (student.pinHash) {
      const ok = typeof pin === 'string' && pin.length > 0 && (await verifyPassword(pin, student.pinHash))
      if (!ok) return NextResponse.json(NO_MATCH, { status: 401 })
    }

    const token = await createStudentSession(student.id)

    const res = NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        class: student.class,
        section: student.section,
        subject: student.subject,
        branch: student.branch,
      },
    })

    res.cookies.set(STUDENT_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return res
  } catch (err) {
    console.error('[auth/student]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
