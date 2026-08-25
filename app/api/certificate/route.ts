export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const programId = new URL(req.url).searchParams.get('programId')

  // Legacy path: original 5-stage onboarding track (stages with no programId)
  if (!programId) {
    const stages = await db.stage.findMany({
      where: { programId: null },
      orderBy: { number: 'asc' },
      include: { progress: { where: { userId: user.id } } },
    })
    if (stages.length === 0) return NextResponse.json({ error: 'No stages found' }, { status: 404 })

    const allPassed = stages.every((s) => s.progress[0]?.passed === true)
    if (!allPassed) return NextResponse.json({ error: 'Not all stages completed' }, { status: 403 })

    const completedAt = stages
      .map((s) => s.progress[0]?.completedAt)
      .filter(Boolean)
      .sort((a, b) => (b! > a! ? 1 : -1))[0]

    return NextResponse.json({
      programName: 'RYSEN Professional Development & Onboarding Programme',
      name: user.name,
      branch: user.branch?.name,
      location: user.branch?.location,
      completedAt,
      stages: stages.map((s) => ({
        number: s.number,
        title: s.title,
        badgeTitle: s.badgeTitle,
        badgeColor: s.badgeColor,
      })),
    })
  }

  // Program-specific certificate
  const program = await db.program.findUnique({ where: { id: programId } })
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 })

  const enrolled = await db.programEnrollment.findUnique({
    where: { userId_programId: { userId: user.id, programId } },
  })
  if (!enrolled) return NextResponse.json({ error: 'Not enrolled in this program' }, { status: 403 })

  const stages = await db.stage.findMany({
    where: { programId },
    orderBy: { number: 'asc' },
    include: { progress: { where: { userId: user.id } } },
  })
  if (stages.length === 0) return NextResponse.json({ error: 'Program has no stages yet' }, { status: 404 })

  const allPassed = stages.every((s) => s.progress[0]?.passed === true)
  if (!allPassed) return NextResponse.json({ error: 'Not all stages completed' }, { status: 403 })

  const completedAt = stages
    .map((s) => s.progress[0]?.completedAt)
    .filter(Boolean)
    .sort((a, b) => (b! > a! ? 1 : -1))[0]

  return NextResponse.json({
    programName: program.name,
    name: user.name,
    branch: user.branch?.name,
    location: user.branch?.location,
    completedAt,
    stages: stages.map((s) => ({
      number: s.number,
      title: s.title,
      badgeTitle: s.badgeTitle,
      badgeColor: s.badgeColor,
    })),
  })
}
