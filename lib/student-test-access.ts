type TestGate = { isPublished: boolean; branchId: string | null; startAt: Date | null; endAt: Date | null }

export type TestBlock = { status: 403 | 404; error: string }

/** Same rule the student test list applies, for by-id reads and submissions. */
export function studentTestBlock(test: TestGate, student: { branchId: string | null }, now = new Date()): TestBlock | null {
  if (!test.isPublished) return { status: 404, error: 'Test not found' }
  if (test.branchId && test.branchId !== student.branchId) return { status: 404, error: 'Test not found' }
  if (test.startAt && now < test.startAt) return { status: 403, error: 'Test has not started yet' }
  if (test.endAt && now > test.endAt) return { status: 403, error: 'Test window has closed' }
  return null
}

export const MAX_ATTEMPTS_PER_TEST = 1

export function isAnswerMap(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value).every((v) => typeof v === 'string')
}
