import { cookies } from 'next/headers'
import { db } from './db'
import { Role } from '@/app/generated/prisma/client'
import crypto from 'crypto'

export const SESSION_COOKIE = 'rysen_session'
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  await db.session.create({ data: { userId, token, expiresAt } })
  return token
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { branch: true } } },
  })

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.session.delete({ where: { token } })
    return null
  }

  return session.user
}

export async function requireAuth(allowedRoles?: Role[]) {
  const user = await getSession()
  if (!user) return null
  if (allowedRoles && !allowedRoles.includes(user.role)) return null
  return user
}

export async function deleteSession(token: string) {
  await db.session.deleteMany({ where: { token } })
}
