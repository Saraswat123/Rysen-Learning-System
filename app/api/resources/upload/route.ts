export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'
import { put } from '@vercel/blob'

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const maxMb = 50
  if (file.size > maxMb * 1024 * 1024) {
    return NextResponse.json({ error: `File too large. Max ${maxMb}MB.` }, { status: 400 })
  }

  try {
    const blob = await put(`resources/${Date.now()}-${file.name}`, file, {
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
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
