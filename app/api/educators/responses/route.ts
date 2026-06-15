export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function GET() {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const [textResponses, mcqProgress] = await Promise.all([
    db.textResponse.findMany({
      include: {
        user: { include: { branch: true } },
        question: { include: { stage: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    db.stageProgress.findMany({
      where: { user: { role: Role.EDUCATOR } },
      include: {
        user: { include: { branch: true } },
        stage: true,
      },
      orderBy: [{ user: { name: 'asc' } }, { stage: { number: 'asc' } }],
    }),
  ])

  // Try to get program names for stages
  let programMap: Record<string, string> = {}
  try {
    const programs = await db.program.findMany()
    programMap = Object.fromEntries(programs.map((p) => [p.id, p.name]))
  } catch {
    // Program table may not exist yet
  }

  const textRows = textResponses.map((r) => ({
    educator: r.user.name,
    email: r.user.email,
    campus: r.user.branch?.name ?? '',
    program: (r.question.stage as { programId?: string | null }).programId
      ? (programMap[(r.question.stage as { programId?: string | null }).programId!] ?? '')
      : '',
    stageNumber: r.question.stage.number,
    stageTitle: r.question.stage.title,
    week: r.question.stage.week ?? '',
    question: r.question.text,
    response: r.response,
    submittedAt: r.createdAt.toISOString(),
  }))

  const mcqRows = mcqProgress.map((p) => ({
    educator: p.user.name,
    email: p.user.email,
    campus: p.user.branch?.name ?? '',
    program: (p.stage as { programId?: string | null }).programId
      ? (programMap[(p.stage as { programId?: string | null }).programId!] ?? '')
      : '',
    stageNumber: p.stage.number,
    stageTitle: p.stage.title,
    week: p.stage.week ?? '',
    attempts: p.attempts,
    bestScore: p.bestScore ?? '',
    passed: p.passed ? 'Yes' : 'No',
    completedAt: p.completedAt ? p.completedAt.toISOString() : '',
  }))

  return NextResponse.json({ textRows, mcqRows })
}
