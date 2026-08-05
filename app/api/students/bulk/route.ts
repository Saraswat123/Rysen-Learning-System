export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

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

    const effectiveBranchId = user.role === Role.EDUCATOR ? (user.branchId ?? null) : (branchId ?? null)

    const results = { added: 0, skipped: 0, errors: [] as string[] }

    for (const s of students) {
      if (!s.name?.trim() || !s.class?.trim()) {
        results.skipped++
        continue
      }
      try {
        await db.student.create({
          data: {
            name: s.name.trim(),
            class: s.class.trim(),
            section: s.section?.trim() ?? '',
            subject: s.subject?.trim() ?? '',
            branchId: effectiveBranchId,
          },
        })
        results.added++
      } catch {
        results.errors.push(s.name)
      }
    }

    return NextResponse.json(results, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.EDUCATOR)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { ids } = await req.json() as { ids: string[] }
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })
    }

    // Educators can only delete their own branch's students
    const whereClause =
      user.role === Role.EDUCATOR
        ? { id: { in: ids }, branchId: user.branchId ?? undefined }
        : { id: { in: ids } }

    const { count } = await db.student.deleteMany({ where: whereClause })
    return NextResponse.json({ deleted: count })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
