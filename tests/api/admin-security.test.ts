import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db, params, request, resetDb, staff } from './harness'
import { Role } from '@/app/generated/prisma/client'

vi.mock('@/lib/db', async () => ({ db: (await import('./harness')).db }))
vi.mock('@/lib/auth', async (orig) => ({ ...(await orig<typeof import('@/lib/auth')>()), getSession: vi.fn() }))
vi.mock('@/lib/student-auth', async (orig) => ({ ...(await orig<typeof import('@/lib/student-auth')>()), getStudentSession: vi.fn() }))
vi.mock('@vercel/blob', () => ({ list: vi.fn(async () => ({ blobs: [] })), del: vi.fn() }))

const { getSession } = await import('@/lib/auth')
const { getStudentSession } = await import('@/lib/student-auth')
const session = vi.mocked(getSession)
const studentSession = vi.mocked(getStudentSession)

beforeEach(() => {
  resetDb()
  session.mockReset()
  studentSession.mockReset()
  delete process.env.CRON_SECRET
})

describe('PUT /api/educators/[id]', async () => {
  const { PUT, DELETE } = await import('@/app/api/educators/[id]/route')

  it('rejects non-admins', async () => {
    session.mockResolvedValue(staff(Role.EDUCATOR) as never)
    const res = await PUT(request('PUT', '/api/educators/e1', { name: 'x' }), params({ id: 'e1' }))
    expect(res.status).toBe(403)
  })

  it('ignores role, email and password in the body (privilege escalation regression)', async () => {
    session.mockResolvedValue(staff(Role.ADMIN) as never)
    db.user.findUnique.mockResolvedValue({ role: Role.EDUCATOR })
    const res = await PUT(
      request('PUT', '/api/educators/e1', { name: ' Ravi ', role: 'SUPER_ADMIN', email: 'evil@x.com', password: 'h', isActive: false }),
      params({ id: 'e1' }),
    )
    expect(res.status).toBe(200)
    expect(db.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { name: 'Ravi', isActive: false } }))
  })

  it('refuses to touch an admin account through the educator route', async () => {
    session.mockResolvedValue(staff(Role.ADMIN) as never)
    db.user.findUnique.mockResolvedValue({ role: Role.SUPER_ADMIN })
    const res = await PUT(request('PUT', '/api/educators/sa', { name: 'x' }), params({ id: 'sa' }))
    expect(res.status).toBe(404)
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('password reset clears the hash and signs the educator out everywhere', async () => {
    session.mockResolvedValue(staff(Role.ADMIN) as never)
    db.user.findUnique.mockResolvedValue({ role: Role.EDUCATOR })
    await PUT(request('PUT', '/api/educators/e1', { resetPassword: true }), params({ id: 'e1' }))
    expect(db.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { password: null, passwordSetAt: null } }))
    expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'e1' } })
  })

  it('DELETE only removes educators', async () => {
    session.mockResolvedValue(staff(Role.ADMIN) as never)
    db.user.deleteMany.mockResolvedValue({ count: 0 })
    const res = await DELETE(request('DELETE', '/api/educators/sa'), params({ id: 'sa' }))
    expect(res.status).toBe(404)
    expect(db.user.deleteMany).toHaveBeenCalledWith({ where: { id: 'sa', role: Role.EDUCATOR } })
  })
})

describe('PUT /api/principals/[id]', async () => {
  const { PUT } = await import('@/app/api/principals/[id]/route')

  it('cannot set a password hash or role', async () => {
    session.mockResolvedValue(staff(Role.ADMIN) as never)
    db.user.findUnique.mockResolvedValue({ role: Role.PRINCIPAL })
    await PUT(request('PUT', '/api/principals/p1', { password: 'attacker-hash', role: 'SUPER_ADMIN', isActive: true }), params({ id: 'p1' }))
    expect(db.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { isActive: true } }))
  })
})

describe('POST /api/admin/seed-orientation-mcq', async () => {
  const { POST } = await import('@/app/api/admin/seed-orientation-mcq/route')
  it('requires an admin session (was public)', async () => {
    session.mockResolvedValue(null)
    expect((await POST()).status).toBe(403)
    session.mockResolvedValue(staff(Role.EDUCATOR) as never)
    expect((await POST()).status).toBe(403)
    expect(db.question.createMany).not.toHaveBeenCalled()
  })
})

describe('cron routes', async () => {
  const cleanup = await import('@/app/api/admin/cleanup/route')
  const digest = await import('@/app/api/admin/weekly-digest/route')

  it('refuse to run when CRON_SECRET is unset, even with "Bearer undefined"', async () => {
    for (const GET of [cleanup.GET, digest.GET]) {
      const res = await GET(request('GET', '/api/admin/cleanup', undefined, { authorization: 'Bearer undefined' }))
      expect(res.status).toBe(401)
    }
  })

  it('require the exact secret', async () => {
    process.env.CRON_SECRET = 's3cret'
    expect((await cleanup.GET(request('GET', '/x', undefined, { authorization: 'Bearer nope' }))).status).toBe(401)
    expect((await cleanup.GET(request('GET', '/x', undefined, { authorization: 'Bearer s3cret' }))).status).toBe(200)
  })
})

describe('/api/stages/[id]', async () => {
  const { GET, PUT } = await import('@/app/api/stages/[id]/route')
  const stage = { id: 's1', title: 'Welcome', questions: [{ id: 'q1', text: '?', correctId: 'opt-b' }] }

  it('needs a session (answer key was public)', async () => {
    session.mockResolvedValue(null)
    expect((await GET(request('GET', '/api/stages/s1'), params({ id: 's1' }))).status).toBe(401)
  })

  it('hides correct answers from people taking the stage', async () => {
    session.mockResolvedValue(staff(Role.PRINCIPAL) as never)
    db.stage.findUnique.mockResolvedValue(stage)
    const body = await (await GET(request('GET', '/api/stages/s1'), params({ id: 's1' }))).json()
    expect(body.questions[0]).not.toHaveProperty('correctId')
  })

  it('admins still get the answer key for editing', async () => {
    session.mockResolvedValue(staff(Role.ADMIN) as never)
    db.stage.findUnique.mockResolvedValue(stage)
    const body = await (await GET(request('GET', '/api/stages/s1'), params({ id: 's1' }))).json()
    expect(body.questions[0].correctId).toBe('opt-b')
  })

  it('PUT only writes editable stage columns', async () => {
    session.mockResolvedValue(staff(Role.ADMIN) as never)
    await PUT(request('PUT', '/api/stages/s1', { title: 'New', passScore: 80, id: 'hijack', createdAt: '2000-01-01', progress: { deleteMany: {} } }), params({ id: 's1' }))
    expect(db.stage.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { title: 'New', passScore: 80 } })
  })
})

describe('GET /api/leaderboard', async () => {
  const { GET } = await import('@/app/api/leaderboard/route')

  it('requires a login — was fully public and leaked staff names/scores', async () => {
    session.mockResolvedValue(null)
    studentSession.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
    expect(db.branch.findMany).not.toHaveBeenCalled()
  })

  it('allows a student session, not just staff', async () => {
    session.mockResolvedValue(null)
    studentSession.mockResolvedValue({ id: 'stu_1' } as never)
    const res = await GET()
    expect(res.status).toBe(200)
  })
})
