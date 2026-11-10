import { db } from './db'
import { Role } from '@/app/generated/prisma/client'

/** Admins see every task; educators and principals only tasks assigned to them. */
export async function canAccessTask(user: { id: string; role: Role }, taskId: string): Promise<boolean> {
  if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) return true
  const assignment = await db.taskAssignment.findFirst({ where: { taskId, userId: user.id }, select: { id: true } })
  return !!assignment
}
