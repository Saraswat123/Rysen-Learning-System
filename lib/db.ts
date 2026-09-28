import { PrismaClient } from '@/app/generated/prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,  // 10s — Neon free tier resumes from sleep
    idleTimeoutMillis: 30000,
    max: 5,
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    // Global default: never ship password/passwordSetAt in any response body.
    // Several admin/educator/principal list-and-detail routes return raw
    // db.user objects (with `include: { branch: true }`, so a per-query
    // `select` isn't a drop-in fix) — this was leaking bcrypt hashes to any
    // authenticated staff account that could view those lists. The handful
    // of auth routes that actually need to verify a password override this
    // per-query with `omit: { password: false }`.
    omit: { user: { password: true, passwordSetAt: true } },
  })
}

export const db = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
