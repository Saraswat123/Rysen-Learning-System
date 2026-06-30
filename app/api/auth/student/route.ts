export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createStudentSession, STUDENT_SESSION_COOKIE } from '@/lib/student-auth'

export async function POST(req: NextRequest) {
  try {
    const { name, class: cls, section, branchId } = await req.json()
    if (!name || !cls) return NextResponse.json({ error: 'Name and class required' }, { status: 400 })

    const student = await db.student.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
        class: cls.trim(),
        ...(section ? { section: section.trim() } : {}),
        ...(branchId ? { branchId } : {}),
        isActive: true,
      },
      include: { branch: true },
    })

    if (!student) return NextResponse.json({ error: 'Student not found. Contact your teacher.' }, { status: 404 })

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
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
