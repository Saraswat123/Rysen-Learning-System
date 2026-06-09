export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { stageId } = await req.json()
  if (!stageId) return NextResponse.json({ error: 'stageId required' }, { status: 400 })

  await db.stageProgress.upsert({
    where: { userId_stageId: { userId: user.id, stageId } },
    update: { docRead: true },
    create: { userId: user.id, stageId, docRead: true },
  })

  return NextResponse.json({ ok: true })
}
