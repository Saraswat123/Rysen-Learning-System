import { Prisma } from '@/app/generated/prisma/client'

// Students added before the createdById backfill (2026-10-17) can't be
// correctly attributed to the educator who actually added them — branches
// with more than one educator all got assigned to a single arbitrary pick.
// So: legacy students stay branch-visible to any educator at that branch
// (old behavior, since we can't know better), and only students added AFTER
// this cutoff are scoped strictly to the educator who added them.
export const CREATED_BY_SCOPE_CUTOFF = new Date('2026-10-17T15:30:00.000Z')

/** Single-record check mirroring educatorStudentWhere, for GET/PUT/DELETE by id. */
export function educatorCanAccessStudent(
  user: { id: string; branchId: string | null },
  student: { createdById: string | null; createdAt: Date; branchId: string | null }
): boolean {
  if (student.createdById === user.id) return true
  if (!user.branchId) return false
  return student.createdAt < CREATED_BY_SCOPE_CUTOFF && student.branchId === user.branchId
}

/** Prisma `where` clause for Student, scoped for an EDUCATOR with the given id/branchId. */
export function educatorStudentWhere(userId: string, branchId: string | null): Prisma.StudentWhereInput {
  return {
    OR: [
      { createdById: userId },
      // Legacy (pre-backfill) students: visible to any educator at the same
      // branch. Only applies when the educator actually has a branch —
      // otherwise this clause would match every legacy student everywhere.
      ...(branchId ? [{ createdAt: { lt: CREATED_BY_SCOPE_CUTOFF }, branchId } as Prisma.StudentWhereInput] : []),
    ],
  }
}
