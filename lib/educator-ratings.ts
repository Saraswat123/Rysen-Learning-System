import { db } from './db'

export interface RatingRow {
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  branch: { id: string; name: string } | null
  kra1: number; kra2: number; kra3: number; kra4: number; kra5: number; kra6: number
  testScore: number      // 0-10, computed live from StudentAttempt data
  average: number        // out of 10, across all 7 categories
  rank: number
  comment: string | null
  finalized: boolean
  hasRating: boolean      // false = admin hasn't scored the 6 KRAs yet this period
}

function periodBounds(period: string) {
  const [y, m] = period.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, 1))
  const end = new Date(Date.UTC(y, m, 1))
  return { start, end }
}

export async function getStemEducatorGroup() {
  return db.educatorGroup.findFirst({
    where: { name: { contains: 'STEM', mode: 'insensitive' } },
    include: { members: { include: { user: { include: { branch: true } } } } },
  })
}

// Computed from that educator's branch's StudentAttempt data within the period's calendar month.
// Not stored — always reflects current test data.
async function computeTestScore(branchId: string | null, period: string): Promise<number> {
  if (!branchId) return 0
  const { start, end } = periodBounds(period)
  const attempts = await db.studentAttempt.findMany({
    where: {
      completedAt: { gte: start, lt: end },
      student: { branchId },
    },
    select: { score: true, totalMarks: true },
  })
  if (attempts.length === 0) return 0
  const avgPct = attempts.reduce((sum, a) => sum + (a.totalMarks > 0 ? (a.score / a.totalMarks) * 100 : 0), 0) / attempts.length
  return Math.round((avgPct / 100) * 10 * 10) / 10 // one decimal, 0-10
}

export async function computeRatingsForPeriod(period: string): Promise<RatingRow[]> {
  const group = await getStemEducatorGroup()
  if (!group) return []

  const members = group.members.filter((m) => m.user.isActive)
  const existingRatings = await db.educatorRating.findMany({
    where: { period, userId: { in: members.map((m) => m.userId) } },
  })
  const ratingMap = new Map(existingRatings.map((r) => [r.userId, r]))

  const rows: RatingRow[] = await Promise.all(members.map(async (m) => {
    const u = m.user
    const rating = ratingMap.get(u.id)
    const testScore = await computeTestScore(u.branchId, period)
    const kra1 = rating?.kra1 ?? 0
    const kra2 = rating?.kra2 ?? 0
    const kra3 = rating?.kra3 ?? 0
    const kra4 = rating?.kra4 ?? 0
    const kra5 = rating?.kra5 ?? 0
    const kra6 = rating?.kra6 ?? 0
    const average = Math.round(((kra1 + kra2 + kra3 + kra4 + kra5 + kra6 + testScore) / 7) * 10) / 10

    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl,
      branch: u.branch ? { id: u.branch.id, name: u.branch.name } : null,
      kra1, kra2, kra3, kra4, kra5, kra6,
      testScore,
      average,
      rank: 0,
      comment: rating?.comment ?? null,
      finalized: rating?.finalized ?? false,
      hasRating: !!rating,
    }
  }))

  rows.sort((a, b) => b.average - a.average)
  rows.forEach((r, i) => { r.rank = i + 1 })
  return rows
}
