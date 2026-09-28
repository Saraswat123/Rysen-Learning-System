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
  const trimmed = text.trim()

  const message = await db.groupMessage.create({
    data: { groupId, userId: user.id, text: trimmed },
    include: { user: { select: { id: true, name: true, branch: { select: { name: true } } } } },
  })

  // @mentions — match "@Full Name" against actual group members (longest name first
  // so "@Priya Sharma" doesn't get matched as just "@Priya" by mistake), notify
  // everyone mentioned except the sender.
  const members = await db.educatorGroupMember.findMany({
    where: { groupId, userId: { not: user.id } },
    include: { user: { select: { id: true, name: true } } },
  })
  const sorted = members.map((m) => m.user).sort((a, b) => b.name.length - a.name.length)
  const mentionedIds = new Set<string>()
  for (const m of sorted) {
    const pattern = new RegExp(`@${m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (pattern.test(trimmed)) mentionedIds.add(m.id)
  }
  if (mentionedIds.size > 0) {
    const group = await db.educatorGroup.findUnique({ where: { id: groupId }, select: { name: true } })
    const snippet = trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed
    await db.notification.createMany({
      data: [...mentionedIds].map((uid) => ({
        userId: uid,
        title: `${user.name} mentioned you in ${group?.name ?? 'a group'}`,
        message: snippet,
        type: 'MENTION',
        relatedId: groupId,
      })),
    }).catch(() => {})
  }

  return NextResponse.json(message)
}
