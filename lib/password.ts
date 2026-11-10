import bcrypt from 'bcryptjs'
import { ensureRuntimeSchema } from './schema-heal'

const SALT_ROUNDS = 10
export const MIN_PASSWORD_LENGTH = 6

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Password columns may not exist yet on a fresh database, and the migrate
// route itself needs a logged-in admin, so auth routes self-heal first.
export function ensurePasswordColumns() {
  return ensureRuntimeSchema()
}
