import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { db, params, rateLimitHits, request, resetDb, staff } from './harness'
import { Role } from '@/app/generated/prisma/client'

vi.mock('@/lib/db', async () => ({ db: (await import('./harness')).db }))
vi.mock('@/lib/schema-heal', () => ({ ensureRuntimeSchema: vi.fn(async () => {}) }))
vi.mock('@/lib/auth', async (orig) => ({ ...(await orig<typeof import('@/lib/auth')>()), getSession: vi.fn() }))
vi.mock('@/lib/student-auth', async (orig) => ({ ...(await orig<typeof import('@/lib/student-auth')>()), getStudentSession: vi.fn(async () => null) }))

const { getSession } = await import('@/lib/auth')
const session = vi.mocked(getSession)

beforeEach(() => {
  resetDb()
  session.mockReset()
  process.env.AUTH_TOKEN_SECRET = 'test-secret-at-least-32-characters-long!!'
})

describe('staff login (educator, admin, principal)', async () => {
  const educator = await import('@/app/api/auth/login/route')
  const admin = await import('@/app/api/auth/admin/route')
  const hash = await bcrypt.hash('correct horse', 4)
  const account = { id: 'e1', name: 'Ravi', email: 'ravi@rysen.in', role: Role.EDUCATOR, isActive: true, branchId: 'branch_A', password: hash }

  it('unknown email, wrong role and wrong password all look the same', async () => {
    db.user.findUnique.mockResolvedValueOnce(null)
    const unknown = await educator.POST(request('POST', '/api/auth/login', { email: 'x@y.z', password: 'p' }))
    db.user.findUnique.mockResolvedValueOnce(account)
    const wrongRole = await admin.POST(request('POST', '/api/auth/admin', { email: 'ravi@rysen.in', password: 'correct horse' }))
    db.user.findUnique.mockResolvedValueOnce(account)
    const wrongPassword = await educator.POST(request('POST', '/api/auth/login', { email: 'ravi@rysen.in', password: 'nope' }))
    const bodies = await Promise.all([unknown, wrongRole, wrongPassword].map((r) => r.json()))
    expect([unknown.status, wrongRole.status, wrongPassword.status]).toEqual([401, 401, 401])
    expect(new Set(bodies.map((b) => JSON.stringify(b))).size).toBe(1)
  })

  it('checks the campus only after the password, so it cannot reveal accounts', async () => {
    db.user.findUnique.mockResolvedValue(account)
    const wrongPw = await educator.POST(request('POST', '/api/auth/login', { email: 'ravi@rysen.in', password: 'nope', branchId: 'branch_B' }))
    expect((await wrongPw.json()).error).toBe('Incorrect email or password.')
    const rightPw = await educator.POST(request('POST', '/api/auth/login', { email: 'ravi@rysen.in', password: 'correct horse', branchId: 'branch_B' }))
    expect((await rightPw.json()).error).toMatch(/campus/)
  })

  it('routes first-time users to password setup', async () => {
    db.user.findUnique.mockResolvedValue({ ...account, password: null })
    const res = await educator.POST(request('POST', '/api/auth/login', { email: 'ravi@rysen.in', password: 'anything' }))
    expect((await res.json()).code).toBe('NO_PASSWORD')
  })

  it('sets an httpOnly session cookie on success', async () => {
    db.user.findUnique.mockResolvedValue(account)
    const res = await educator.POST(request('POST', '/api/auth/login', { email: 'RAVI@rysen.in ', password: 'correct horse', branchId: 'branch_A' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toMatch(/rysen_session=.*HttpOnly/i)
    expect(db.session.create).toHaveBeenCalled()
  })

  it('stops password guessing with 429', async () => {
    rateLimitHits(21)
    const res = await educator.POST(request('POST', '/api/auth/login', { email: 'ravi@rysen.in', password: 'x' }))
    expect(res.status).toBe(429)
    expect(db.user.findUnique).not.toHaveBeenCalled()
  })
})

describe('first-time password setup', async () => {
  const { POST } = await import('@/app/api/auth/set-password/route')
  const { signSetupToken } = await import('@/lib/account-setup-otp')

  it('allows only a few guesses per emailed code', async () => {
    const token = await signSetupToken('e1', 'ravi@rysen.in', '123456')
    rateLimitHits(6)
    const res = await POST(request('POST', '/api/auth/set-password', { token, otp: '000000', password: 'newpass1', confirmPassword: 'newpass1' }))
    expect(res.status).toBe(429)
  })

  it('rejects a wrong code and accepts the right one', async () => {
    const token = await signSetupToken('e1', 'ravi@rysen.in', '123456')
    const wrong = await POST(request('POST', '/api/auth/set-password', { token, otp: '000000', password: 'newpass1', confirmPassword: 'newpass1' }))
    expect(wrong.status).toBe(401)
    db.user.findUnique.mockResolvedValue({ id: 'e1', name: 'Ravi', email: 'ravi@rysen.in', role: Role.EDUCATOR, isActive: true, password: null })
    const right = await POST(request('POST', '/api/auth/set-password', { token, otp: '123456', password: 'newpass1', confirmPassword: 'newpass1' }))
    expect(right.status).toBe(200)
    expect(db.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'e1' } }))
  })
})

describe('educator campus scoping', async () => {
  const tests = await import('@/app/api/student-tests/[id]/route')
  const questions = await import('@/app/api/student-tests/[id]/questions/route')
  const progress = await import('@/app/api/students/progress/route')
  const comments = await import('@/app/api/tasks/[id]/comments/route')

  it("cannot delete or overwrite another campus's test", async () => {
    session.mockResolvedValue(staff(Role.EDUCATOR, { branchId: 'branch_A' }) as never)
    db.studentTest.findUnique.mockResolvedValue({ branchId: 'branch_B' })
    expect((await tests.DELETE(request('DELETE', '/api/student-tests/t9'), params({ id: 't9' }))).status).toBe(404)
    expect((await questions.PUT(request('PUT', '/api/student-tests/t9/questions', { questions: [] }), params({ id: 't9' }))).status).toBe(404)
    expect(db.studentTest.delete).not.toHaveBeenCalled()
    expect(db.studentQuestion.deleteMany).not.toHaveBeenCalled()
  })

  it('can read but not edit all-campus tests', async () => {
    session.mockResolvedValue(staff(Role.EDUCATOR, { branchId: 'branch_A' }) as never)
    db.studentTest.findUnique.mockResolvedValue({ branchId: null, questions: [], contentBlocks: [], _count: { attempts: 0 } })
    expect((await tests.GET(request('GET', '/api/student-tests/t0'), params({ id: 't0' }))).status).toBe(200)
    expect((await tests.DELETE(request('DELETE', '/api/student-tests/t0'), params({ id: 't0' }))).status).toBe(404)
  })

  it('cannot move a test to another campus', async () => {
    session.mockResolvedValue(staff(Role.EDUCATOR, { branchId: 'branch_A' }) as never)
    db.studentTest.findUnique.mockResolvedValue({ branchId: 'branch_A' })
    await tests.PUT(request('PUT', '/api/student-tests/t1', { title: 'T', branchId: 'branch_B' }), params({ id: 't1' }))
    expect(db.studentTest.update.mock.calls[0][0].data).not.toHaveProperty('branchId')
  })

  it('an educator without a campus sees no students (used to see every campus)', async () => {
    session.mockResolvedValue(staff(Role.EDUCATOR, { branchId: null }) as never)
    await progress.GET()
    expect(db.student.findMany.mock.calls[0][0].where).toMatchObject({ id: { in: [] } })
  })

  it('task comments require an assignment', async () => {
    session.mockResolvedValue(staff(Role.EDUCATOR) as never)
    db.taskAssignment.findFirst.mockResolvedValue(null)
    const res = await comments.POST(request('POST', '/api/tasks/t1/comments', { text: 'hi' }), params({ id: 't1' }))
    expect(res.status).toBe(404)
    expect(db.taskComment.create).not.toHaveBeenCalled()
  })
})
