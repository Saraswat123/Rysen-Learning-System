export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { put } from '@vercel/blob'

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files allowed' }, { status: 400 })
  }
  const maxMb = 5
  if (file.size > maxMb * 1024 * 1024) {
    return NextResponse.json({ error: `Image too large. Max ${maxMb}MB.` }, { status: 400 })
  }

  try {
    const blob = await put(`avatars/${user.id}-${Date.now()}-${file.name}`, file, {
      access: 'public',
    })
    await db.user.update({ where: { id: user.id }, data: { avatarUrl: blob.url } })
    return NextResponse.json({ url: blob.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('BLOB_READ_WRITE_TOKEN')) {
      return NextResponse.json({ error: 'Vercel Blob not configured.' }, { status: 503 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await db.user.update({ where: { id: user.id }, data: { avatarUrl: null } })
  return NextResponse.json({ ok: true })
}
