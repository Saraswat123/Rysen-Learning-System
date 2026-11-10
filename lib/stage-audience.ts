import { Prisma, Role } from '@/app/generated/prisma/client'

/** Stages that count toward a user's completion: published and meant for their role. */
export function countedStageWhere(role: Role): Prisma.StageWhereInput {
  return {
    isPublished: true,
    applicableTo: { in: ['BOTH', role === Role.PRINCIPAL ? 'PRINCIPAL' : 'EDUCATOR'] },
  }
}

export function isStageForRole(stage: { isPublished: boolean; applicableTo: string }, role: Role): boolean {
  if (role === Role.ADMIN || role === Role.SUPER_ADMIN) return true
  return stage.isPublished && (stage.applicableTo === 'BOTH' || stage.applicableTo === (role === Role.PRINCIPAL ? 'PRINCIPAL' : 'EDUCATOR'))
}
