import { SignJWT, jwtVerify } from 'jose'
import crypto from 'crypto'

// Stateless email-verification OTP for first-time account setup — no DB table
// needed. The JWT payload is readable by the client, so the OTP digest must be
// keyed with the server secret: a plain hash of a 6-digit code is brute-forced
// offline in under a second.
const OTP_TTL_SECONDS = 10 * 60 // 10 minutes

function secretKey() {
  const secret = process.env.AUTH_TOKEN_SECRET
  if (!secret) throw new Error('AUTH_TOKEN_SECRET is not configured')
  return new TextEncoder().encode(secret)
}

function hashOtp(userId: string, otp: string): string {
  return crypto.createHmac('sha256', secretKey()).update(`${userId}:${otp}`).digest('hex')
}

export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString()
}

export async function signSetupToken(userId: string, email: string, otp: string): Promise<string> {
  return new SignJWT({ uid: userId, email: email.toLowerCase().trim(), otpHash: hashOtp(userId, otp) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${OTP_TTL_SECONDS}s`)
    .sign(secretKey())
}

export async function verifySetupToken(token: string, otp: string): Promise<{ uid: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey())
    const expected = Buffer.from(hashOtp(payload.uid as string, otp))
    const actual = Buffer.from(String(payload.otpHash ?? ''))
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null
    return { uid: payload.uid as string, email: payload.email as string }
  } catch {
    return null
  }
}
