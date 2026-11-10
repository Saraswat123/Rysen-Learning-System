export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { ensureRuntimeSchema } from '@/lib/schema-heal'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'
import { educatorCanAccessStudent } from '@/lib/student-scope'

function isStaff(role: Role) {
  return role === Role.SUPER_ADMIN || role === Role.ADMIN || role === Role.EDUCATOR
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user || !isStaff(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    const { id } = await params
    const student = await db.student.findUnique({
      where: { id },
      include: {
        branch: true,
        attempts: { include: { test: true }, orderBy: { completedAt: 'desc' } },
      },
    })
    if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (user.role === Role.EDUCATOR && !educatorCanAccessStudent(user, student)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(student)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user || !isStaff(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    const { id } = await params

    if (user.role === Role.EDUCATOR) {
      const existing = await db.student.findUnique({ where: { id }, select: { createdById: true, createdAt: true, branchId: true } })
      if (!existing || !educatorCanAccessStudent(user, existing)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    let pinHash: string | null | undefined
    if (body.pin === null) pinHash = null
    else if (body.pin !== undefined) {
      if (typeof body.pin !== 'string' || !/^\d{4,6}$/.test(body.pin)) {
        return NextResponse.json({ error: 'PIN must be 4 to 6 digits' }, { status: 400 })
      }
      await ensureRuntimeSchema()
      pinHash = await hashPassword(body.pin)
    }

    const student = await db.student.update({
      where: { id },
      data: {
        ...(typeof body.name === 'string' && body.name.trim() && { name: body.name.trim() }),
        ...(typeof body.class === 'string' && body.class.trim() && { class: body.class.trim() }),
        ...(typeof body.section === 'string' && { section: body.section.trim() }),
        ...(typeof body.subject === 'string' && { subject: body.subject.trim() }),
        // Educators can't move a student to another campus, that would take it out of their own scope
        ...(user.role !== Role.EDUCATOR && body.branchId !== undefined && { branchId: body.branchId || null }),
        ...(typeof body.isActive === 'boolean' && { isActive: body.isActive }),
        ...(pinHash !== undefined && { pinHash }),
      },
      include: { branch: true },
    })
    if (pinHash !== undefined || body.isActive === false) {
      await db.studentSession.deleteMany({ where: { studentId: id } })
    }
    return NextResponse.json(student)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user || !isStaff(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    const { id } = await params

    if (user.role === Role.EDUCATOR) {
      const existing = await db.student.findUnique({ where: { id }, select: { createdById: true, createdAt: true, branchId: true } })
      if (!existing || !educatorCanAccessStudent(user, existing)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
    }

    await db.student.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
