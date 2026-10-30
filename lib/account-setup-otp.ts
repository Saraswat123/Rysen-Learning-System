import { SignJWT, jwtVerify } from 'jose'
import crypto from 'crypto'

// Stateless email-verification OTP for first-time account setup — no DB table
// needed. The signed JWT carries a hash of the OTP (never the OTP itself), so
// a leaked token alone can't be replayed without the code that was emailed.
const OTP_TTL_SECONDS = 10 * 60 // 10 minutes

function secretKey() {
  const secret = process.env.AUTH_TOKEN_SECRET
  if (!secret) throw new Error('AUTH_TOKEN_SECRET is not configured')
  return new TextEncoder().encode(secret)
}

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString()
}

export async function signSetupToken(userId: string, email: string, otp: string): Promise<string> {
  return new SignJWT({ uid: userId, email: email.toLowerCase().trim(), otpHash: hashOtp(otp) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${OTP_TTL_SECONDS}s`)
    .sign(secretKey())
}

export async function verifySetupToken(token: string, otp: string): Promise<{ uid: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey())
    if (payload.otpHash !== hashOtp(otp)) return null
    return { uid: payload.uid as string, email: payload.email as string }
  } catch {
    return null
  }
}
