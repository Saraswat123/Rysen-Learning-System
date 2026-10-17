export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

// Temporary — identifies which Neon host/db the LIVE app is actually
// connected to, without exposing the password. Used once to reconcile a
// mismatch between the Vercel dashboard's DATABASE_URL and what's really
// serving traffic, then deleted.
export async function GET(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get('secret')
  if (secret !== 'rysen-diag-2026') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const raw = process.env.DATABASE_URL ?? ''
  try {
    const u = new URL(raw)
    return NextResponse.json({ host: u.hostname, database: u.pathname.replace('/', ''), user: u.username })
  } catch {
    return NextResponse.json({ error: 'DATABASE_URL not parseable', present: !!raw })
  }
}
