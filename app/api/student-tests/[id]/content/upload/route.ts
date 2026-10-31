export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

// Client-side direct-to-Blob upload (video/audio files skip our serverless
// function body entirely — a server route can't take a multi-MB request body
// on Vercel). This route only hands out a short-lived upload token.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = (await req.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getSession()
        if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.EDUCATOR)) {
          throw new Error('Unauthorized')
        }
        if (!pathname.startsWith(`topic-content/${id}/`)) {
          throw new Error('Invalid upload path')
        }
        return {
          allowedContentTypes: [
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'video/mp4', 'video/webm', 'video/quicktime',
            'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg',
          ],
          addRandomSuffix: true,
          maximumSizeInBytes: 200 * 1024 * 1024, // 200MB — enough for a short lesson video
        }
      },
      onUploadCompleted: async () => {},
    })
    return NextResponse.json(jsonResponse)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 })
  }
}
