import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getAIInsights } from '@/lib/groq'
import { Role } from '@/app/generated/prisma/client'

export async function GET() {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const [educators, stages, progress] = await Promise.all([
    db.user.count({ where: { role: Role.EDUCATOR, isActive: true } }),
    db.stage.findMany({ orderBy: { number: 'asc' } }),
    db.stageProgress.findMany({ include: { stage: true } }),
  ])

  const stageStats = stages.map((stage) => {
    const stageProgress = progress.filter((p) => p.stageId === stage.id)
    const passed = stageProgress.filter((p) => p.passed).length
    const attempted = stageProgress.length
    const avgScore = attempted
      ? Math.round(stageProgress.reduce((s, p) => s + (p.bestScore ?? 0), 0) / attempted)
      : 0
    return { stage: stage.title, number: stage.number, passed, attempted, avgScore }
  })

  const prompt = `
RYSEN Learning Centre Training Data Summary:
- Total active educators: ${educators}
- Stage completion stats:
${stageStats.map((s) => `  Stage ${s.number} (${s.stage}): ${s.attempted} attempted, ${s.passed} passed, avg score: ${s.avgScore}%`).join('\n')}

Provide 3-4 specific, actionable insights for the admin team. Focus on:
1. Which stages have low pass rates and why educators might be struggling
2. Which stages educators complete quickly vs slowly
3. Recommendations to improve training effectiveness
Keep each insight to 1-2 sentences. Be direct and specific.
`

  const insights = await getAIInsights(prompt)

  return NextResponse.json({ insights, stageStats, totalEducators: educators })
}
