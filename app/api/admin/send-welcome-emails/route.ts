export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'
import { sendWelcomeEmail } from '@/lib/welcome-email'

// Bulk-sends the welcome/activate email to every existing account that hasn't
// set a password yet — covers everyone created before this flow existed.
// Skips anyone already activated (password set) so they don't get a
// confusing "welcome" email for an account they already use daily.
export async function POST() {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const unactivated = await db.user.findMany({
    where: {
      isActive: true,
      password: null,
      role: { in: [Role.EDUCATOR, Role.PRINCIPAL, Role.ADMIN, Role.SUPER_ADMIN] },
    },
    select: { name: true, email: true, role: true },
  })

  if (!unactivated.length) {
    return NextResponse.json({ ok: true, sentTo: 0, total: 0, message: 'Everyone has already activated their account.' })
  }

  const results = await Promise.allSettled(unactivated.map((u) => sendWelcomeEmail(u)))
  const sentTo = results.filter((r) => r.status === 'fulfilled' && r.value === true).length

  return NextResponse.json({ ok: true, sentTo, total: unactivated.length })
}
