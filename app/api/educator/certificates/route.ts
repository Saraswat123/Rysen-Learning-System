export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Legacy track (stages with no programId) — original onboarding flow
  const legacyStages = await db.stage.findMany({
    where: { programId: null },
    include: { progress: { where: { userId: user.id } } },
  })
  const legacy = legacyStages.length > 0 ? {
    programId: null,
    programName: 'RYSEN Professional Development & Onboarding Programme',
    totalStages: legacyStages.length,
    completedStages: legacyStages.filter((s) => s.progress[0]?.passed).length,
    allPassed: legacyStages.every((s) => s.progress[0]?.passed === true),
  } : null

  // Enrolled programs
  const enrollments = await db.programEnrollment.findMany({
    where: { userId: user.id },
    include: {
      program: {
        include: {
          stages: { include: { progress: { where: { userId: user.id } } } },
        },
      },
    },
  })

  const programs = enrollments
    .filter((e) => e.program.stages.length > 0)
    .map((e) => ({
      programId: e.program.id,
      programName: e.program.name,
      totalStages: e.program.stages.length,
      completedStages: e.program.stages.filter((s) => s.progress[0]?.passed).length,
      allPassed: e.program.stages.every((s) => s.progress[0]?.passed === true),
    }))

  return NextResponse.json({
    certificates: [...(legacy ? [legacy] : []), ...programs],
  })
}
