import { describe, expect, it } from 'vitest'
import { studentTestBlock, isAnswerMap } from '@/lib/student-test-access'
import { canAccessBranchRecord, educatorBranchListWhere } from '@/lib/branch-scope'
import { countedStageWhere, isStageForRole } from '@/lib/stage-audience'
import { educatorCanAccessStudent, educatorStudentWhere, CREATED_BY_SCOPE_CUTOFF } from '@/lib/student-scope'
import { Role } from '@/app/generated/prisma/client'

const live = { isPublished: true, branchId: 'A', startAt: null, endAt: null }
const now = new Date('2026-11-10T10:00:00Z')

describe('studentTestBlock', () => {
  it('allows a published test for the student campus inside its window', () => {
    expect(studentTestBlock(live, { branchId: 'A' }, now)).toBeNull()
    expect(studentTestBlock({ ...live, branchId: null }, { branchId: 'B' }, now)).toBeNull()
  })
  it('hides unpublished and other-campus tests as not found', () => {
    expect(studentTestBlock({ ...live, isPublished: false }, { branchId: 'A' }, now)?.status).toBe(404)
    expect(studentTestBlock(live, { branchId: 'B' }, now)?.status).toBe(404)
    expect(studentTestBlock(live, { branchId: null }, now)?.status).toBe(404)
  })
  it('enforces the schedule window', () => {
    expect(studentTestBlock({ ...live, startAt: new Date('2026-11-11') }, { branchId: 'A' }, now)).toEqual({ status: 403, error: 'Test has not started yet' })
    expect(studentTestBlock({ ...live, endAt: new Date('2026-11-09') }, { branchId: 'A' }, now)).toEqual({ status: 403, error: 'Test window has closed' })
  })
})

describe('isAnswerMap', () => {
  it('accepts question-id to option-id strings only', () => {
    expect(isAnswerMap({ q1: 'o1', q2: 'o3' })).toBe(true)
    expect(isAnswerMap({})).toBe(true)
    for (const bad of [null, undefined, 'x', [], ['o1'], { q1: 1 }, { q1: null }]) expect(isAnswerMap(bad)).toBe(false)
  })
})

describe('canAccessBranchRecord', () => {
  const educatorA = { role: Role.EDUCATOR, branchId: 'A' }
  it('admins can read and edit anything', () => {
    for (const role of [Role.ADMIN, Role.SUPER_ADMIN]) {
      expect(canAccessBranchRecord({ role, branchId: null }, { branchId: 'Z' }, 'edit')).toBe(true)
    }
  })
  it('educators read their campus and all-campus records', () => {
    expect(canAccessBranchRecord(educatorA, { branchId: 'A' }, 'read')).toBe(true)
    expect(canAccessBranchRecord(educatorA, { branchId: null }, 'read')).toBe(true)
    expect(canAccessBranchRecord(educatorA, { branchId: 'B' }, 'read')).toBe(false)
  })
  it('educators edit only their own campus records', () => {
    expect(canAccessBranchRecord(educatorA, { branchId: 'A' }, 'edit')).toBe(true)
    expect(canAccessBranchRecord(educatorA, { branchId: null }, 'edit')).toBe(false)
    expect(canAccessBranchRecord(educatorA, { branchId: 'B' }, 'edit')).toBe(false)
  })
  it('an educator without a campus cannot edit anything and principals get nothing', () => {
    expect(canAccessBranchRecord({ role: Role.EDUCATOR, branchId: null }, { branchId: null }, 'edit')).toBe(false)
    expect(canAccessBranchRecord({ role: Role.PRINCIPAL, branchId: 'A' }, { branchId: 'A' }, 'read')).toBe(false)
  })
  it('list filter never widens to every campus when the campus is unset', () => {
    expect(educatorBranchListWhere('A')).toEqual({ OR: [{ branchId: null }, { branchId: 'A' }] })
    expect(educatorBranchListWhere(null)).toEqual({ OR: [{ branchId: null }] })
  })
})

describe('stage audience', () => {
  it('counts only published stages for the role', () => {
    expect(countedStageWhere(Role.EDUCATOR)).toEqual({ isPublished: true, applicableTo: { in: ['BOTH', 'EDUCATOR'] } })
    expect(countedStageWhere(Role.PRINCIPAL)).toEqual({ isPublished: true, applicableTo: { in: ['BOTH', 'PRINCIPAL'] } })
  })
  it('isStageForRole matches the same rule, admins see everything', () => {
    expect(isStageForRole({ isPublished: true, applicableTo: 'EDUCATOR' }, Role.EDUCATOR)).toBe(true)
    expect(isStageForRole({ isPublished: true, applicableTo: 'PRINCIPAL' }, Role.EDUCATOR)).toBe(false)
    expect(isStageForRole({ isPublished: false, applicableTo: 'BOTH' }, Role.EDUCATOR)).toBe(false)
    expect(isStageForRole({ isPublished: false, applicableTo: 'PRINCIPAL' }, Role.ADMIN)).toBe(true)
  })
})

describe('educator student scope', () => {
  const before = new Date(CREATED_BY_SCOPE_CUTOFF.getTime() - 1000)
  const after = new Date(CREATED_BY_SCOPE_CUTOFF.getTime() + 1000)
  it('educators see students they added', () => {
    expect(educatorCanAccessStudent({ id: 'u1', branchId: 'A' }, { createdById: 'u1', createdAt: after, branchId: 'B' })).toBe(true)
  })
  it('legacy students are shared within the campus; newer ones are not', () => {
    expect(educatorCanAccessStudent({ id: 'u1', branchId: 'A' }, { createdById: 'u2', createdAt: before, branchId: 'A' })).toBe(true)
    expect(educatorCanAccessStudent({ id: 'u1', branchId: 'A' }, { createdById: 'u2', createdAt: after, branchId: 'A' })).toBe(false)
    expect(educatorCanAccessStudent({ id: 'u1', branchId: null }, { createdById: 'u2', createdAt: before, branchId: null })).toBe(false)
  })
  it('where clause omits the legacy branch rule without a campus', () => {
    expect(educatorStudentWhere('u1', null)).toEqual({ OR: [{ createdById: 'u1' }] })
  })
})
