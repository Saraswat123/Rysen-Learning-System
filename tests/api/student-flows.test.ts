import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { db, params, rateLimitHits, request, resetDb } from './harness'

vi.mock('@/lib/db', async () => ({ db: (await import('./harness')).db }))
vi.mock('@/lib/schema-heal', () => ({ ensureRuntimeSchema: vi.fn(async () => {}) }))
vi.mock('@/lib/student-auth', async (orig) => ({
  ...(await orig<typeof import('@/lib/student-auth')>()),
  getStudentSession: vi.fn(),
  createStudentSession: vi.fn(async () => 'student-token'),
}))
vi.mock('@/lib/auth', async (orig) => ({ ...(await orig<typeof import('@/lib/auth')>()), getSession: vi.fn(async () => null) }))
vi.mock('@/lib/student-sheet-sync', () => ({ syncStudentSheetRow: vi.fn(async () => {}) }))
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: vi.fn() }))

const { getStudentSession } = await import('@/lib/student-auth')
const studentSession = vi.mocked(getStudentSession)
const { after } = await import('next/server')

const student = { id: 'stu_1', name: 'Asha Rao', class: '10', section: 'A', subject: '', branchId: 'branch_A', isActive: true }

beforeEach(() => {
  resetDb()
  studentSession.mockReset()
  vi.mocked(after).mockClear()
})

describe('POST /api/auth/student', async () => {
  const { POST } = await import('@/app/api/auth/student/route')
  const login = (body: object) => POST(request('POST', '/api/auth/student', body))

  it('uses one message for an unknown student and a wrong PIN (no enumeration)', async () => {
    db.student.findFirst.mockResolvedValueOnce(null)
    const unknown = await login({ name: 'Nobody', class: '10' })
    db.student.findFirst.mockResolvedValueOnce({ ...student, branch: null, pinHash: await bcrypt.hash('4321', 4) })
    const wrongPin = await login({ name: 'Asha Rao', class: '10', pin: '0000' })
    expect(unknown.status).toBe(401)
    expect(wrongPin.status).toBe(401)
    expect(await unknown.json()).toEqual(await wrongPin.json())
  })

  it('requires the PIN once a teacher has set one', async () => {
    db.student.findFirst.mockResolvedValue({ ...student, branch: null, pinHash: await bcrypt.hash('4321', 4) })
    expect((await login({ name: 'Asha Rao', class: '10' })).status).toBe(401)
    const ok = await login({ name: 'Asha Rao', class: '10', pin: '4321' })
    expect(ok.status).toBe(200)
    expect(ok.headers.get('set-cookie')).toContain('rysen_student_session=student-token')
  })

  it('students without a PIN log in with name and class as before', async () => {
    db.student.findFirst.mockResolvedValue({ ...student, branch: null, pinHash: null })
    expect((await login({ name: 'asha  rao', class: '10' })).status).toBe(200)
  })

  it('never returns the PIN hash', async () => {
    db.student.findFirst.mockResolvedValue({ ...student, branch: null, pinHash: null })
    const body = await (await login({ name: 'Asha Rao', class: '10' })).json()
    expect(JSON.stringify(body)).not.toContain('pinHash')
  })

  it('blocks guessing once the rate limit is exceeded', async () => {
    rateLimitHits(31)
    const res = await login({ name: 'Asha Rao', class: '10' })
    expect(res.status).toBe(429)
    expect(db.student.findFirst).not.toHaveBeenCalled()
  })

  it('rejects malformed bodies with 400', async () => {
    expect((await POST(request('POST', '/api/auth/student', '{not json'))).status).toBe(400)
    expect((await login({ name: '', class: '10' })).status).toBe(400)
  })
})

describe('POST /api/student-tests/[id]/attempt', async () => {
  const { POST } = await import('@/app/api/student-tests/[id]/attempt/route')
  const test = {
    id: 't1', isPublished: true, branchId: 'branch_A', startAt: null, endAt: null, passScore: 50,
    questions: [
      { id: 'q1', marks: 1, correctId: 'a', text: '', type: 'MCQ', imageUrl: null, options: [], explanation: null },
      { id: 'q2', marks: 1, correctId: 'b', text: '', type: 'MCQ', imageUrl: null, options: [], explanation: null },
    ],
  }
  const submit = (answers: unknown) => POST(request('POST', '/api/student-tests/t1/attempt', { answers }), params({ id: 't1' }))

  it('needs a student session', async () => {
    studentSession.mockResolvedValue(null)
    expect((await submit({})).status).toBe(401)
  })

  it('validates the answers payload', async () => {
    studentSession.mockResolvedValue(student as never)
    expect((await submit(undefined)).status).toBe(400)
    expect((await submit(['a'])).status).toBe(400)
  })

  it('refuses unpublished and other-campus tests', async () => {
    studentSession.mockResolvedValue(student as never)
    db.studentTest.findUnique.mockResolvedValueOnce({ ...test, isPublished: false })
    expect((await submit({})).status).toBe(404)
    db.studentTest.findUnique.mockResolvedValueOnce({ ...test, branchId: 'branch_B' })
    expect((await submit({})).status).toBe(404)
    expect(db.studentAttempt.create).not.toHaveBeenCalled()
  })

  it('refuses after the window closes', async () => {
    studentSession.mockResolvedValue(student as never)
    db.studentTest.findUnique.mockResolvedValue({ ...test, endAt: new Date('2020-01-01') })
    expect((await submit({})).status).toBe(403)
  })

  it('grades, stores one attempt, and schedules the sheet update', async () => {
    studentSession.mockResolvedValue(student as never)
    db.studentTest.findUnique.mockResolvedValue(test)
    db.studentAttempt.count.mockResolvedValue(0)
    const res = await submit({ q1: 'a', q2: 'x' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ score: 1, totalMarks: 2, passed: true })
    expect(db.$executeRaw).toHaveBeenCalled()
    expect(after).toHaveBeenCalledTimes(1)
  })

  it('allows only one attempt per test', async () => {
    studentSession.mockResolvedValue(student as never)
    db.studentTest.findUnique.mockResolvedValue(test)
    db.studentAttempt.count.mockResolvedValue(1)
    const res = await submit({ q1: 'a' })
    expect(res.status).toBe(409)
    expect(db.studentAttempt.create).not.toHaveBeenCalled()
  })
})

describe('GET /api/student-tests/[id] as a student', async () => {
  const { GET } = await import('@/app/api/student-tests/[id]/route')
  it('blocks a second sitting and unpublished tests', async () => {
    studentSession.mockResolvedValue(student as never)
    db.studentTest.findUnique.mockResolvedValueOnce({ id: 't1', isPublished: false, branchId: null, startAt: null, endAt: null, questions: [] })
    expect((await GET(request('GET', '/api/student-tests/t1'), params({ id: 't1' }))).status).toBe(404)
    db.studentTest.findUnique.mockResolvedValueOnce({ id: 't1', isPublished: true, branchId: null, startAt: null, endAt: null, questions: [] })
    db.studentAttempt.count.mockResolvedValueOnce(1)
    expect((await GET(request('GET', '/api/student-tests/t1'), params({ id: 't1' }))).status).toBe(409)
  })

  it('never sends correct answers to a student', async () => {
    studentSession.mockResolvedValue(student as never)
    db.studentTest.findUnique.mockResolvedValue({
      id: 't1', isPublished: true, branchId: null, startAt: null, endAt: null,
      questions: [{ id: 'q1', type: 'MCQ', text: '?', imageUrl: null, videoUrl: null, options: [{ id: 'a' }], marks: 1, order: 0, correctId: 'a', explanation: 'x' }],
    })
    const body = await (await GET(request('GET', '/api/student-tests/t1'), params({ id: 't1' }))).json()
    expect(body.questions[0]).not.toHaveProperty('correctId')
  })
})
