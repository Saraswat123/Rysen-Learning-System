export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse, after } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'
import { sendWelcomeEmail } from '@/lib/welcome-email'

const MAX_ROWS = 500

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const rows = body?.rows
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Import at most ${MAX_ROWS} educators at a time` }, { status: 400 })
  }

  const errors: string[] = []
  const candidates = new Map<string, string>()
  for (const row of rows) {
    const name = typeof row?.name === 'string' ? row.name.trim() : ''
    const email = typeof row?.email === 'string' ? row.email.toLowerCase().trim() : ''
    if (!name || !email || !email.includes('@')) {
      errors.push(`Skipped invalid row: "${name}" / "${email}"`)
      continue
    }
    if (!candidates.has(email)) candidates.set(email, name)
  }

  const existing = await db.user.findMany({ where: { email: { in: [...candidates.keys()] } }, select: { email: true } })
  for (const { email } of existing) candidates.delete(email)

  const toCreate = [...candidates].map(([email, name]) => ({ name, email, role: Role.EDUCATOR, createdBy: user.id }))
  const { count } = await db.user.createMany({ data: toCreate, skipDuplicates: true })

  // Emails go out only after the accounts exist, and after() keeps the function alive to send them
  after(async () => {
    const results = await Promise.allSettled(toCreate.map((u) => sendWelcomeEmail(u)))
    const failed = results.filter((r) => r.status === 'rejected' || r.value === false).length
    if (failed > 0) console.error(`[educators/bulk] ${failed} welcome emails failed`)
  })

  return NextResponse.json({ added: count, skipped: rows.length - count - errors.length, errors }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { ids } = (await req.json().catch(() => ({}))) as { ids?: string[] }
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_ROWS) {
    return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })
  }
  if (ids.includes(user.id)) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  try {
    const { count } = await db.user.deleteMany({
      where: { id: { in: ids }, role: Role.EDUCATOR },
    })
    return NextResponse.json({ deleted: count })
  } catch (err) {
    console.error('[educators/bulk DELETE]', err)
    return NextResponse.json(
      { error: 'Some educators are still referenced by other records. Run Settings → Database migration, then retry.' },
      { status: 409 },
    )
  }
}
