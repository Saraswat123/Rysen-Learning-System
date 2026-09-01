export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'
import { listCategories, ensureRecognitionTables } from '@/lib/educator-ratings'

function isAdmin(role: Role) {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN
}

export async function GET() {
  const user = await getSession()
  if (!user || !isAdmin(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  await ensureRecognitionTables()
  const categories = await listCategories()
  return NextResponse.json(categories)
}

// Create a new recognition category. Either links to an existing EducatorGroup
// (groupId) or creates a brand new one (groupName).
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || !isAdmin(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  await ensureRecognitionTables()

  const { name, groupId, groupName } = await req.json() as { name: string; groupId?: string; groupName?: string }
  if (!name?.trim()) return NextResponse.json({ error: 'Category name required' }, { status: 400 })

  let finalGroupId = groupId
  if (!finalGroupId) {
    if (!groupName?.trim()) return NextResponse.json({ error: 'Provide an existing groupId or a groupName to create one' }, { status: 400 })
    const group = await db.educatorGroup.create({ data: { name: groupName.trim() } })
    finalGroupId = group.id
  }

  const existing = await db.recognitionCategory.findUnique({ where: { groupId: finalGroupId } })
  if (existing) return NextResponse.json({ error: 'That educator group already has a recognition category' }, { status: 409 })

  const category = await db.recognitionCategory.create({
    data: {
      name: name.trim(),
      groupId: finalGroupId,
      criteria: {
        create: [{ label: 'Student Test Understanding', order: 99, isAutoTest: true }],
      },
    },
    include: { criteria: true, group: true },
  })
  return NextResponse.json(category, { status: 201 })
}
