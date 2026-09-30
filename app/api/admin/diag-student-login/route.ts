export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Temporary diagnostic — creates a throwaway ALL-CAPS student, then tries to log in
// with a normal-case name/class/section using the exact same query the real login
// route uses, to prove (or disprove) case-insensitive matching actually works
// against production Postgres. Deletes the test student either way.
export async function POST(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get('secret')
  if (secret !== 'rysen-diag-2026') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const testName = 'DIAGNOSTIC TEST STUDENT'
  const testClass = 'DIAG'
  const testSection = 'X'

  // Clean up any leftover from a previous failed run
  await db.student.deleteMany({ where: { name: testName } })

  const created = await db.student.create({
    data: { name: testName, class: testClass, section: testSection, subject: '', isActive: true },
  })

  const normalizedName = 'diagnostic test student'.trim().replace(/\s+/g, ' ')
  const found = await db.student.findFirst({
    where: {
      name: { equals: normalizedName, mode: 'insensitive' },
      class: { equals: 'diag', mode: 'insensitive' },
      section: { equals: 'x', mode: 'insensitive' },
      isActive: true,
    },
  })

  await db.student.delete({ where: { id: created.id } })

  return NextResponse.json({
    createdAs: testName,
    triedLoginAs: normalizedName,
    matchFound: !!found,
    matchedId: found?.id ?? null,
    verdict: found ? 'Case-insensitive matching WORKS in production.' : 'Case-insensitive matching FAILED — real bug found.',
  })
}
