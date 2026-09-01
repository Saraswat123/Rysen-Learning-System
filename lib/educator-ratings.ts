import { db } from './db'

// Self-heal: these tables ship via the admin-only migrate route, which requires an
// already-authenticated admin session. An educator could hit /api/educator/recognition
// before any admin has logged in post-deploy, so every entry point here ensures the
// tables exist first (idempotent, memoised after first success).
let tablesEnsured = false
export async function ensureRecognitionTables() {
  if (tablesEnsured) return
  try {
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "RecognitionCategory" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "groupId" TEXT NOT NULL UNIQUE REFERENCES "EducatorGroup"("id") ON DELETE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "RatingCriterion" (
      "id" TEXT PRIMARY KEY,
      "categoryId" TEXT NOT NULL REFERENCES "RecognitionCategory"("id") ON DELETE CASCADE,
      "label" TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      "isAutoTest" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "EducatorRating" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "categoryId" TEXT NOT NULL REFERENCES "RecognitionCategory"("id") ON DELETE CASCADE,
      "period" TEXT NOT NULL,
      "scores" JSONB NOT NULL DEFAULT '{}',
      "comment" TEXT,
      "ratedById" TEXT NOT NULL REFERENCES "User"("id"),
      "finalized" BOOLEAN NOT NULL DEFAULT false,
      "finalizedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE ("userId", "categoryId", "period")
    )`)
    tablesEnsured = true
  } catch {
    // best-effort — if it fails, the query below will surface the real error
  }
}

export interface CriterionScore {
  criterionId: string
  label: string
  isAutoTest: boolean
  score: number
}

export interface RatingRow {
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  branch: { id: string; name: string } | null
  scores: CriterionScore[]
  average: number
  rank: number
  comment: string | null
  finalized: boolean
  hasRating: boolean
}

function periodBounds(period: string) {
  const [y, m] = period.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, 1))
  const end = new Date(Date.UTC(y, m, 1))
  return { start, end }
}

// Computed from that educator's branch's StudentAttempt data within the period's calendar month.
async function computeTestScore(branchId: string | null, period: string): Promise<number> {
  if (!branchId) return 0
  const { start, end } = periodBounds(period)
  const attempts = await db.studentAttempt.findMany({
    where: { completedAt: { gte: start, lt: end }, student: { branchId } },
    select: { score: true, totalMarks: true },
  })
  if (attempts.length === 0) return 0
  const avgPct = attempts.reduce((sum, a) => sum + (a.totalMarks > 0 ? (a.score / a.totalMarks) * 100 : 0), 0) / attempts.length
  return Math.round((avgPct / 100) * 10 * 10) / 10
}

export async function getCategory(categoryId: string) {
  return db.recognitionCategory.findUnique({
    where: { id: categoryId },
    include: {
      criteria: { orderBy: { order: 'asc' } },
      group: { include: { members: { include: { user: { include: { branch: true } } } } } },
    },
  })
}

export async function listCategories() {
  return db.recognitionCategory.findMany({
    include: {
      criteria: { orderBy: { order: 'asc' } },
      group: { select: { id: true, name: true, _count: { select: { members: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function computeRatingsForPeriod(categoryId: string, period: string): Promise<RatingRow[]> {
  const category = await getCategory(categoryId)
  if (!category) return []

  const members = category.group.members.filter((m) => m.user.isActive)
  const existingRatings = await db.educatorRating.findMany({
    where: { categoryId, period, userId: { in: members.map((m) => m.userId) } },
  })
  const ratingMap = new Map(existingRatings.map((r) => [r.userId, r]))
  const manualCriteria = category.criteria.filter((c) => !c.isAutoTest)
  const autoCriterion = category.criteria.find((c) => c.isAutoTest) ?? null

  const rows: RatingRow[] = await Promise.all(members.map(async (m) => {
    const u = m.user
    const rating = ratingMap.get(u.id)
    const storedScores = (rating?.scores as Record<string, number> | null) ?? {}

    const scores: CriterionScore[] = manualCriteria.map((c) => ({
      criterionId: c.id, label: c.label, isAutoTest: false,
      score: storedScores[c.id] ?? 0,
    }))

    if (autoCriterion) {
      const testScore = await computeTestScore(u.branchId, period)
      scores.push({ criterionId: autoCriterion.id, label: autoCriterion.label, isAutoTest: true, score: testScore })
    }

    const total = scores.reduce((s, c) => s + c.score, 0)
    const average = scores.length > 0 ? Math.round((total / scores.length) * 10) / 10 : 0

    return {
      userId: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl,
      branch: u.branch ? { id: u.branch.id, name: u.branch.name } : null,
      scores, average, rank: 0,
      comment: rating?.comment ?? null,
      finalized: rating?.finalized ?? false,
      hasRating: !!rating,
    }
  }))

  rows.sort((a, b) => b.average - a.average)
  rows.forEach((r, i) => { r.rank = i + 1 })
  return rows
}
