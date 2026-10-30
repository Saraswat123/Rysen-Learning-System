export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.EDUCATOR)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const { id } = await params
    const program = await db.studentProgram.findUnique({
      where: { id },
      include: {
        tests: { include: { _count: { select: { questions: true, attempts: true } } }, orderBy: { order: 'asc' } },
        branch: { select: { id: true, name: true } },
        createdByUser: { select: { name: true } },
      },
    })
    if (!program) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(program)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.EDUCATOR)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const { id } = await params
    const body = await req.json()
    const { testIds, ...data } = body as { testIds?: string[]; title?: string; description?: string; targetClass?: string; isPublished?: boolean }

    const program = await db.studentProgram.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.targetClass !== undefined && { targetClass: data.targetClass }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      },
    })

    // Replace which tests belong to this program — detach any test currently
    // pointing here that isn't in the new list, attach everything that is.
    if (Array.isArray(testIds)) {
      await db.studentTest.updateMany({ where: { programId: id }, data: { programId: null } })
      if (testIds.length) {
        await db.studentTest.updateMany({ where: { id: { in: testIds } }, data: { programId: id } })
      }
    }

    return NextResponse.json(program)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.EDUCATOR)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const { id } = await params
    // Tests become unassigned (programId = null) due to ON DELETE SET NULL — not deleted
    await db.studentProgram.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
