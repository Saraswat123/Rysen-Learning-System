export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

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
    if (user.role === Role.EDUCATOR && student.createdById !== user.id) {
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
      const existing = await db.student.findUnique({ where: { id }, select: { createdById: true } })
      if (!existing || existing.createdById !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
    }

    const body = await req.json()
    const student = await db.student.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.class !== undefined && { class: body.class }),
        ...(body.section !== undefined && { section: body.section }),
        ...(body.subject !== undefined && { subject: body.subject }),
        ...(body.branchId !== undefined && { branchId: body.branchId || null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: { branch: true },
    })
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
      const existing = await db.student.findUnique({ where: { id }, select: { createdById: true } })
      if (!existing || existing.createdById !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
    }

    await db.student.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
