export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Temporary — seeds/removes a throwaway student so we can hit the REAL
// /api/auth/student endpoint with an ALL-CAPS name and prove it logs in.
// POST ?secret=... creates the student, DELETE ?secret=... removes it.
const SECRET = 'rysen-diag-2026'
const NAME = 'capstest student'
const CLASS = 'capstest'
const SECTION = 'a'

export async function POST(req: NextRequest) {
  if (new URL(req.url).searchParams.get('secret') !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  await db.student.deleteMany({ where: { name: { equals: NAME, mode: 'insensitive' } } })
  const s = await db.student.create({ data: { name: NAME, class: CLASS, section: SECTION, subject: '', isActive: true } })
  return NextResponse.json({ created: s.id, name: NAME, class: CLASS, section: SECTION })
}

export async function DELETE(req: NextRequest) {
  if (new URL(req.url).searchParams.get('secret') !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const r = await db.student.deleteMany({ where: { name: { equals: NAME, mode: 'insensitive' } } })
  return NextResponse.json({ deleted: r.count })
}
