import { NextResponse } from 'next/server'
import { db } from './db'
import { Role } from '@/app/generated/prisma/client'

type Staff = { role: Role; branchId: string | null }
type Mode = 'read' | 'edit'

const isAdmin = (u: Staff) => u.role === Role.ADMIN || u.role === Role.SUPER_ADMIN

/**
 * Educators read their own campus's records plus all-campus ones (branchId
 * null, admin-authored) and edit only their own campus's. Admins: everything.
 */
export function canAccessBranchRecord(user: Staff, record: { branchId: string | null }, mode: Mode): boolean {
  if (isAdmin(user)) return true
  if (user.role !== Role.EDUCATOR) return false
  if (mode === 'read' && record.branchId === null) return true
  return !!user.branchId && record.branchId === user.branchId
}

/** Prisma `where` fragment for list routes over branch-scoped records. */
export function educatorBranchListWhere(branchId: string | null) {
  return { OR: [{ branchId: null }, ...(branchId ? [{ branchId }] : [])] }
}

const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 })

export async function studentTestDenied(user: Staff, testId: string, mode: Mode): Promise<NextResponse | null> {
  if (isAdmin(user)) return null
  const test = await db.studentTest.findUnique({ where: { id: testId }, select: { branchId: true } })
  if (!test) return notFound()
  return canAccessBranchRecord(user, test, mode) ? null : notFound()
}

export async function studentProgramDenied(user: Staff, programId: string, mode: Mode): Promise<NextResponse | null> {
  if (isAdmin(user)) return null
  const program = await db.studentProgram.findUnique({ where: { id: programId }, select: { branchId: true } })
  if (!program) return notFound()
  return canAccessBranchRecord(user, program, mode) ? null : notFound()
}
