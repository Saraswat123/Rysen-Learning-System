export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'
import { educatorStudentWhere } from '@/lib/student-scope'

const MAX_ROWS = 500

export async function POST(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.EDUCATOR)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const { students, branchId } = body as {
      students: { name: string; class: string; section?: string; subject?: string }[]
      branchId?: string
    }

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: 'No students provided' }, { status: 400 })
    }
    if (students.length > MAX_ROWS) {
      return NextResponse.json({ error: `Import at most ${MAX_ROWS} students at a time` }, { status: 400 })
    }

    const effectiveBranchId = user.role === Role.EDUCATOR ? (user.branchId ?? null) : (branchId ?? null)

    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
    const valid = students
      .filter((s) => s && str(s.name) && str(s.class))
      .map((s) => ({
        name: str(s.name).replace(/\s+/g, ' '),
        class: str(s.class),
        section: str(s.section),
        subject: str(s.subject),
        branchId: effectiveBranchId,
        createdById: user.id,
      }))

    const { count } = await db.student.createMany({ data: valid })
    return NextResponse.json({ added: count, skipped: students.length - valid.length, errors: [] }, { status: 201 })
  } catch (err) {
    console.error('[students/bulk]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.EDUCATOR)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { ids } = await req.json() as { ids: string[] }
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_ROWS) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })
    }

    // Educators can only bulk-delete students they can otherwise access
    // (their own, or legacy branch students — see lib/student-scope.ts)
    const whereClause =
      user.role === Role.EDUCATOR
        ? { AND: [{ id: { in: ids } }, educatorStudentWhere(user.id, user.branchId)] }
        : { id: { in: ids } }

    const { count } = await db.student.deleteMany({ where: whereClause })
    return NextResponse.json({ deleted: count })
  } catch (err) {
    console.error('[students/bulk]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
