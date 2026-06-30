export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getStudentSession } from '@/lib/student-auth'

export async function GET() {
  try {
    const student = await getStudentSession()
    if (!student) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    return NextResponse.json({ student })
  } catch {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
}
