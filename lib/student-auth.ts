import { cookies } from 'next/headers'
import { db } from './db'
import crypto from 'crypto'

export const STUDENT_SESSION_COOKIE = 'rysen_student_session'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function createStudentSession(studentId: string): Promise<string> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  await db.studentSession.create({ data: { studentId, token, expiresAt } })
  return token
}

export async function getStudentSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(STUDENT_SESSION_COOKIE)?.value
  if (!token) return null

  const session = await db.studentSession.findUnique({
    where: { token },
    include: { student: { include: { branch: true } } },
  })

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.studentSession.delete({ where: { token } })
    return null
  }

  return session.student
}

export async function deleteStudentSession(token: string) {
  await db.studentSession.deleteMany({ where: { token } })
}
