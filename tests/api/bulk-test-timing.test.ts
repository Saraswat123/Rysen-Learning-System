import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Role } from '@/app/generated/prisma/client'
import { db, request, resetDb, staff } from './harness'

vi.mock('@/lib/db', async () => ({ db: (await import('./harness')).db }))
vi.mock('@/lib/auth', async (orig) => ({ ...(await orig<typeof import('@/lib/auth')>()), getSession: vi.fn() }))

const { getSession } = await import('@/lib/auth')
const { PUT } = await import('@/app/api/student-tests/bulk-timing/route')
const session = vi.mocked(getSession)

beforeEach(() => {
  resetDb()
  session.mockReset()
})

describe('bulk student test timing', () => {
  it('restricts bulk changes to admins', async () => {
    session.mockResolvedValue(staff(Role.EDUCATOR) as never)
    const response = await PUT(request('PUT', '/api/student-tests/bulk-timing', { ids: ['test_a'], timeLimitMinutes: 45 }))
    expect(response.status).toBe(403)
    expect(db.studentTest.updateMany).not.toHaveBeenCalled()
  })

  it('updates selected published tests in one database call', async () => {
    session.mockResolvedValue(staff(Role.ADMIN) as never)
    db.studentTest.findMany.mockResolvedValue([
      { id: 'test_a', startAt: null, endAt: null },
      { id: 'test_b', startAt: null, endAt: null },
    ])
    db.studentTest.updateMany.mockResolvedValue({ count: 2 })
    const response = await PUT(request('PUT', '/api/student-tests/bulk-timing', {
      ids: ['test_a', 'test_b'], startAt: '2026-11-18T04:30:00.000Z', endAt: '2026-11-18T05:30:00.000Z', timeLimitMinutes: 45,
    }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ updated: 2 })
    expect(db.studentTest.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['test_a', 'test_b'] } },
      data: { startAt: new Date('2026-11-18T04:30:00.000Z'), endAt: new Date('2026-11-18T05:30:00.000Z'), timeLimitMinutes: 45 },
    })
  })

  it('checks existing closing times before changing only the opening time', async () => {
    session.mockResolvedValue(staff(Role.SUPER_ADMIN) as never)
    db.studentTest.findMany.mockResolvedValue([{ id: 'test_a', startAt: null, endAt: new Date('2026-11-18T05:00:00.000Z') }])
    const response = await PUT(request('PUT', '/api/student-tests/bulk-timing', { ids: ['test_a'], startAt: '2026-11-18T06:00:00.000Z' }))
    expect(response.status).toBe(400)
    expect(db.studentTest.updateMany).not.toHaveBeenCalled()
  })

  it('does not update a partial selection when a test is missing', async () => {
    session.mockResolvedValue(staff(Role.ADMIN) as never)
    db.studentTest.findMany.mockResolvedValue([{ id: 'test_a', startAt: null, endAt: null }])
    const response = await PUT(request('PUT', '/api/student-tests/bulk-timing', { ids: ['test_a', 'missing'], endAt: null }))
    expect(response.status).toBe(404)
    expect(db.studentTest.updateMany).not.toHaveBeenCalled()
  })
})
