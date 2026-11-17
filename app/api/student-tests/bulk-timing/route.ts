import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@/app/generated/prisma/client'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

type TimingUpdate = {
  startAt?: Date | null
  endAt?: Date | null
  timeLimitMinutes?: number
}

function parseDate(value: unknown): Date | null | undefined {
  if (value === null) return null
  if (typeof value !== 'string' || !value.trim()) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body: unknown = await req.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }
    const input = body as Record<string, unknown>
    if (!Array.isArray(input.ids) || input.ids.length < 1 || input.ids.length > 500 ||
      !input.ids.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 100)) {
      return NextResponse.json({ error: 'Select between 1 and 500 tests.' }, { status: 400 })
    }
    const ids = [...new Set(input.ids as string[])]
    const data: TimingUpdate = {}
    if ('startAt' in input) {
      const startAt = parseDate(input.startAt)
      if (startAt === undefined) return NextResponse.json({ error: 'Invalid opening time.' }, { status: 400 })
      data.startAt = startAt
    }
    if ('endAt' in input) {
      const endAt = parseDate(input.endAt)
      if (endAt === undefined) return NextResponse.json({ error: 'Invalid closing time.' }, { status: 400 })
      data.endAt = endAt
    }
    if ('timeLimitMinutes' in input) {
      if (typeof input.timeLimitMinutes !== 'number' || !Number.isInteger(input.timeLimitMinutes) ||
        input.timeLimitMinutes < 5 || input.timeLimitMinutes > 180) {
        return NextResponse.json({ error: 'Time limit must be between 5 and 180 minutes.' }, { status: 400 })
      }
      data.timeLimitMinutes = input.timeLimitMinutes
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Choose at least one time setting to update.' }, { status: 400 })
    }

    const tests = await db.studentTest.findMany({
      where: { id: { in: ids } },
      select: { id: true, startAt: true, endAt: true },
    })
    if (tests.length !== ids.length) return NextResponse.json({ error: 'A selected test was not found.' }, { status: 404 })
    if (data.startAt !== undefined || data.endAt !== undefined) {
      for (const test of tests) {
        const startAt = data.startAt === undefined ? test.startAt : data.startAt
        const endAt = data.endAt === undefined ? test.endAt : data.endAt
        if (startAt && endAt && endAt <= startAt) {
          return NextResponse.json({ error: 'Closing time must be after opening time for every selected test.' }, { status: 400 })
        }
      }
    }

    const result = await db.studentTest.updateMany({ where: { id: { in: ids } }, data })
    return NextResponse.json({ updated: result.count })
  } catch (err) {
    console.error('[student-tests/bulk-timing]', err)
    return NextResponse.json({ error: 'Could not update test timing. Please try again.' }, { status: 500 })
  }
}
