export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

async function getMembership(userId: string, groupId: string) {
  return db.educatorGroupMember.findUnique({ where: { groupId_userId: { groupId, userId } } })
}

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: groupId } = await params

  // Admins can read all; educators must be a member
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
  if (!isAdmin) {
    const member = await getMembership(user.id, groupId)
    if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })
  }

  const messages = await db.groupMessage.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, branch: { select: { name: true } } } } },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  return NextResponse.json(messages)
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: groupId } = await params

  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
  if (!isAdmin) {
    const member = await getMembership(user.id, groupId)
    if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })
  }

  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  const message = await db.groupMessage.create({
    data: { groupId, userId: user.id, text: text.trim() },
    include: { user: { select: { id: true, name: true, branch: { select: { name: true } } } } },
  })

  return NextResponse.json(message)
}
