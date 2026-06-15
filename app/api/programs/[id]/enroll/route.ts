export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Educator self-enroll / unenroll
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: programId } = await params

  const program = await db.program.findUnique({ where: { id: programId } })
  if (!program || !program.isPublished) return NextResponse.json({ error: 'Program not found' }, { status: 404 })

  try {
    await db.programEnrollment.create({
      data: { userId: user.id, programId },
    })
  } catch {
    // Already enrolled — ignore unique constraint error
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: programId } = await params

  await db.programEnrollment.deleteMany({ where: { userId: user.id, programId } })
  return NextResponse.json({ ok: true })
}
