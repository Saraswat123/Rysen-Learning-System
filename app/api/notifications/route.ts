export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })
  return NextResponse.json(notifications)
}

export async function PUT(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, all } = await req.json()
  if (all) {
    await db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } })
  } else if (id) {
    await db.notification.update({ where: { id }, data: { read: true } })
  }
  return NextResponse.json({ ok: true })
}
