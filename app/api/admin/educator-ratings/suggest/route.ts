export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'
import { getCategory } from '@/lib/educator-ratings'

// Suggests scores only for criteria backed by real tracked data — never
// invents a number for "Punctuality", "Event Coordination" etc, since nothing
// in the system tracks those and a fabricated score would misrepresent a real
// educator's performance on a certificate. Admin reviews/edits before saving;
// this never writes anything itself.
const DATA_BACKED_LABEL_PATTERNS: { match: RegExp; compute: (branchId: string | null, start: Date, end: Date) => Promise<number> }[] = [
  {
    // "Student Test Conduction" — how many attempts their branch's students
    // actually completed this month. 5 attempts ≈ 1 point, capped at 10.
    match: /test conduction/i,
    compute: async (branchId, start, end) => {
      if (!branchId) return 0
      const count = await db.studentAttempt.count({
        where: { completedAt: { gte: start, lt: end }, student: { branchId } },
      })
      return Math.min(10, Math.round(count / 5))
    },
  },
]

function periodBounds(period: string) {
  const [y, m] = period.split('-').map(Number)
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) }
}

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('categoryId')
  const period = searchParams.get('period')
  if (!categoryId || !period) return NextResponse.json({ error: 'categoryId and period required' }, { status: 400 })

  const category = await getCategory(categoryId)
  if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

  const dataBackedCriteria = category.criteria.filter((c) => !c.isAutoTest && DATA_BACKED_LABEL_PATTERNS.some((p) => p.match.test(c.label)))
  if (!dataBackedCriteria.length) {
    return NextResponse.json({ suggestions: {}, criteriaCovered: [], message: 'No criteria in this category have trackable data to suggest from.' })
  }

  const { start, end } = periodBounds(period)
  const members = category.group.members.filter((m) => m.user.isActive)

  const suggestions: Record<string, Record<string, number>> = {}
  for (const member of members) {
    const userScores: Record<string, number> = {}
    for (const criterion of dataBackedCriteria) {
      const pattern = DATA_BACKED_LABEL_PATTERNS.find((p) => p.match.test(criterion.label))!
      userScores[criterion.id] = await pattern.compute(member.user.branchId, start, end)
    }
    suggestions[member.userId] = userScores
  }

  return NextResponse.json({
    suggestions,
    criteriaCovered: dataBackedCriteria.map((c) => ({ id: c.id, label: c.label })),
  })
}
