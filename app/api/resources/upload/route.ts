export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'
import { put } from '@vercel/blob'

// Blobs are public on the blob domain; anything a browser would render or run there is refused
const BLOCKED_TYPES = new Set([
  'text/html', 'application/xhtml+xml', 'image/svg+xml', 'application/xml', 'text/xml',
  'application/javascript', 'text/javascript', 'application/x-javascript',
])
const BLOCKED_EXTENSIONS = /\.(html?|xhtml|svg|xml|m?js)$/i

function safeFilename(name: string): string {
  const cleaned = name.normalize('NFKD').replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '-').replace(/^\.+/, '')
  return cleaned.slice(-120) || 'file'
}

export async function POST(req: NextRequest) {
  let user
  try {
    user = await getSession()
  } catch (sessionErr) {
    console.error('[resources/upload] session', sessionErr)
    return NextResponse.json({ error: 'Could not verify your session. Please log in again.' }, { status: 500 })
  }
  if (!user) {
    return NextResponse.json({ error: 'Not logged in — session missing or expired. Please refresh and log in again.' }, { status: 401 })
  }
  if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Only admins can upload resources.' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (BLOCKED_TYPES.has(file.type) || BLOCKED_EXTENSIONS.test(file.name)) {
    return NextResponse.json({ error: 'HTML, SVG, XML and script files cannot be uploaded.' }, { status: 400 })
  }

  const maxMb = 50
  if (file.size > maxMb * 1024 * 1024) {
    return NextResponse.json({ error: `File too large. Max ${maxMb}MB.` }, { status: 400 })
  }

  try {
    const blob = await put(`resources/${Date.now()}-${safeFilename(file.name)}`, file, {
      access: 'public',
    })
    return NextResponse.json({ url: blob.url, filename: file.name, size: file.size })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('BLOB_READ_WRITE_TOKEN')) {
      return NextResponse.json({
        error: 'Vercel Blob not configured. Go to Vercel Dashboard → Storage → Create Blob Store, then link it to this project.',
      }, { status: 503 })
    }
    console.error('[resources/upload]', err)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }
}
