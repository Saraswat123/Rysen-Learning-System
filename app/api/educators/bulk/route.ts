import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { rows } = await req.json() as { rows: { name: string; email: string }[] }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  const results = { added: 0, skipped: 0, errors: [] as string[] }

  for (const row of rows) {
    const name = row.name?.trim()
    const email = row.email?.toLowerCase().trim()

    if (!name || !email || !email.includes('@')) {
      results.errors.push(`Skipped invalid row: "${name}" / "${email}"`)
      results.skipped++
      continue
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      results.skipped++
      continue
    }

    await db.user.create({
      data: { name, email, role: Role.EDUCATOR, createdBy: user.id },
    })
    results.added++
  }

  return NextResponse.json(results, { status: 201 })
}
