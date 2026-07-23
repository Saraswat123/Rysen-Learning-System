export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'
import { list, del as blobDel } from '@vercel/blob'

const NOTIFICATION_TTL_DAYS = 30
const UNREAD_TTL_DAYS = 90

async function runCleanup() {
  const results: Record<string, number | string> = {}

  // 1. Delete read notifications older than 30 days
  const readCutoff = new Date()
  readCutoff.setDate(readCutoff.getDate() - NOTIFICATION_TTL_DAYS)
  const deletedRead = await db.notification.deleteMany({
    where: { read: true, createdAt: { lt: readCutoff } },
  })
  results.notificationsReadDeleted = deletedRead.count

  // 2. Delete unread notifications older than 90 days
  const unreadCutoff = new Date()
  unreadCutoff.setDate(unreadCutoff.getDate() - UNREAD_TTL_DAYS)
  const deletedUnread = await db.notification.deleteMany({
    where: { read: false, createdAt: { lt: unreadCutoff } },
  })
  results.notificationsUnreadDeleted = deletedUnread.count

  // 3. Delete orphaned blobs (uploaded files with no matching Resource.url)
  let orphanedBlobs = 0
  try {
    const { blobs } = await list({ prefix: 'resources/' })
    const resourceUrls = await db.resource.findMany({
      where: { url: { not: null } },
      select: { url: true },
    })
    const urlSet = new Set(resourceUrls.map((r) => r.url))

    for (const blob of blobs) {
      if (!urlSet.has(blob.url)) {
        await blobDel(blob.url)
        orphanedBlobs++
      }
    }
  } catch {
    results.blobCleanupError = 'Blob store not reachable or not configured'
  }
  results.orphanedBlobsDeleted = orphanedBlobs

  results.ranAt = new Date().toISOString()
  return results
}

// Called by Vercel Cron (no auth header needed — protected by CRON_SECRET)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const results = await runCleanup()
  return NextResponse.json({ ok: true, results })
}

// Manual trigger from admin UI
export async function POST() {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const results = await runCleanup()
  return NextResponse.json({ ok: true, results })
}
