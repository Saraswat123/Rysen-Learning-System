export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'
import { computeWeeklyDigest, renderDigestEmailHtml } from '@/lib/weekly-digest'
import { sendEmail } from '@/lib/email'

async function sendDigest() {
  const data = await computeWeeklyDigest()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${process.env.VERCEL_URL ?? 'rysen-learning-centre.vercel.app'}`
  const html = renderDigestEmailHtml(data, `${appUrl}/admin/analytics`)

  const recipients = await db.user.findMany({
    where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] }, isActive: true },
    select: { email: true },
  })

  if (!process.env.BREVO_API_KEY && !process.env.RESEND_API_KEY) {
    return { ok: false, error: 'No email provider configured (BREVO_API_KEY or RESEND_API_KEY)', sentTo: 0 }
  }
  if (!recipients.length) return { ok: false, error: 'No active admin recipients found', sentTo: 0 }

  const results = await Promise.all(
    recipients.map((r) => sendEmail(r.email, 'RYSEN Weekly Digest — Top Educators & Activity Report', html))
  )
  const sentTo = results.filter(Boolean).length
  return { ok: true, sentTo, totalRecipients: recipients.length, data, ranAt: new Date().toISOString() }
}

// Called by Vercel Cron every week — protected by CRON_SECRET, same pattern as /api/admin/cleanup
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await sendDigest()
  return NextResponse.json(result)
}

// Manual trigger from Admin Settings page
export async function POST() {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const result = await sendDigest()
  return NextResponse.json(result)
}
