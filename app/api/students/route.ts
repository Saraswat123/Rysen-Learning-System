export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

function isStaff(role: Role) {
  return role === Role.SUPER_ADMIN || role === Role.ADMIN || role === Role.EDUCATOR
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user || !isStaff(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get('branchId')
    const cls = searchParams.get('class')

    // Educators see only their branch's students
    const effectiveBranchId = user.role === Role.EDUCATOR ? (user.branchId ?? undefined) : (branchId ?? undefined)

    const students = await db.student.findMany({
      where: {
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        ...(cls ? { class: cls } : {}),
      },
      include: { branch: true, _count: { select: { attempts: true } } },
      orderBy: [{ class: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json(students)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user || !isStaff(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const body = await req.json()
    const { name, class: cls, section, subject, branchId } = body
    if (!name || !cls) return NextResponse.json({ error: 'Name and class required' }, { status: 400 })

    // Educators always add to their own branch
    const effectiveBranchId = user.role === Role.EDUCATOR ? (user.branchId ?? null) : (branchId || null)

    const student = await db.student.create({
      data: {
        name: name.trim(),
        class: cls.trim(),
        section: section?.trim() ?? '',
        subject: subject?.trim() ?? '',
        branchId: effectiveBranchId,
      },
      include: { branch: true },
    })
    return NextResponse.json(student, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
