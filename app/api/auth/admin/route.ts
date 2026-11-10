export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { staffLogin } from '@/lib/staff-login'
import { Role } from '@/app/generated/prisma/client'

export function POST(req: NextRequest) {
  return staffLogin(req, { roles: [Role.ADMIN, Role.SUPER_ADMIN], checkBranch: false, label: 'admin-login' })
}
