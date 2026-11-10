import { NextRequest } from 'next/server'
import { db } from './db'
import { ensureRuntimeSchema } from './schema-heal'

export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

// $1 = key, $2 = window in seconds. Parameterised; shared with the DB tests.
export const RATE_LIMIT_SQL = `
  INSERT INTO "RateLimit" ("key", "count", "resetAt")
  VALUES ($1, 1, NOW() + $2::integer * INTERVAL '1 second')
  ON CONFLICT ("key") DO UPDATE SET
    "count" = CASE WHEN "RateLimit"."resetAt" < NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
    "resetAt" = CASE WHEN "RateLimit"."resetAt" < NOW()
      THEN NOW() + $2::integer * INTERVAL '1 second' ELSE "RateLimit"."resetAt" END
  RETURNING "count"`

/**
 * Fixed-window counter stored in Postgres so it holds across serverless
 * instances. Returns false once `key` exceeds `limit` hits inside the window.
 * Fails open on a DB error: the request that follows would hit the same DB.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  await ensureRuntimeSchema()
  try {
    const rows = await db.$queryRawUnsafe<{ count: number }[]>(RATE_LIMIT_SQL, key, windowSeconds)
    return Number(rows[0]?.count ?? 0) <= limit
  } catch (err) {
    console.error('[rate-limit]', err)
    return true
  }
}

export const TOO_MANY = { error: 'Too many attempts. Please wait a few minutes and try again.' }
