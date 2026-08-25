import bcrypt from 'bcryptjs'
import { db } from './db'

const SALT_ROUNDS = 10
export const MIN_PASSWORD_LENGTH = 6

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Self-healing: password columns may not exist yet on first deploy since the
// full migration route requires an already-authenticated session. Auth routes
// call this before touching User.password so login/setup work with zero manual steps.
let columnsEnsured = false
export async function ensurePasswordColumns() {
  if (columnsEnsured) return
  try {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT`)
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordSetAt" TIMESTAMP(3)`)
    columnsEnsured = true
  } catch {
    // best-effort — if it fails, the query below will surface the real error
  }
}
