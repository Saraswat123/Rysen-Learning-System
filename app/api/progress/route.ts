export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stages = await db.stage.findMany({
    orderBy: { number: 'asc' },
    include: {
      progress: { where: { userId: user.id } },
      _count: { select: { questions: true } },
    },
  })

  let programs: { id: string; name: string; description: string | null; isPublished: boolean; applicableTo: string; order: number }[] = []
  let enrolledProgramIds: Set<string> = new Set()

  try {
    programs = await db.program.findMany({ where: { isPublished: true }, orderBy: { order: 'asc' } })
    const enrollments = await db.programEnrollment.findMany({ where: { userId: user.id }, select: { programId: true } })
    enrolledProgramIds = new Set(enrollments.map((e) => e.programId))
  } catch {
    // Tables may not exist yet — fall through, show all as unassigned
  }

  const hasEnrollments = enrolledProgramIds.size > 0

  // Group stages by programId, unlock sequentially within each program
  const grouped = new Map<string | null, typeof stages>()
  for (const s of stages) {
    const key = (s as { programId?: string | null }).programId ?? null
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(s)
  }

  const result = stages.map((stage) => {
    const key = (stage as { programId?: string | null }).programId ?? null
    const group = grouped.get(key) ?? []
    const idx = group.findIndex((s) => s.id === stage.id)
    const progress = stage.progress[0] ?? null
    const prevPassed = idx === 0 || group[idx - 1].progress[0]?.passed === true
    return { ...stage, progress, isUnlocked: stage.isPublished && prevPassed }
  })

  // Programs user is enrolled in
  const enrolledPrograms = programs
    .filter((p) => !hasEnrollments || enrolledProgramIds.has(p.id))
    .map((p) => ({ ...p, stages: result.filter((s) => (s as { programId?: string | null }).programId === p.id), enrolled: true }))

  // Programs published but not enrolled in (for "Available" section)
  const availablePrograms = hasEnrollments
    ? programs
        .filter((p) => !enrolledProgramIds.has(p.id))
        .map((p) => ({ ...p, stages: [], enrolled: false }))
    : []

  const unassigned = result.filter((s) => {
    const pid = (s as { programId?: string | null }).programId
    return !pid || programs.length === 0
  })

  return NextResponse.json({ programs: enrolledPrograms, availablePrograms, unassigned, stages: result })
}
