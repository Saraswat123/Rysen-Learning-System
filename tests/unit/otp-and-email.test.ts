import crypto from 'crypto'
import { beforeAll, describe, expect, it } from 'vitest'
import { decodeJwt } from 'jose'

beforeAll(() => {
  process.env.AUTH_TOKEN_SECRET = 'test-secret-at-least-32-characters-long!!'
})

describe('setup OTP token', () => {
  it('verifies with the right code and rejects a wrong one', async () => {
    const { signSetupToken, verifySetupToken } = await import('@/lib/account-setup-otp')
    const token = await signSetupToken('user_1', 'Teacher@Example.com ', '123456')
    expect(await verifySetupToken(token, '123456')).toEqual({ uid: 'user_1', email: 'teacher@example.com' })
    expect(await verifySetupToken(token, '654321')).toBeNull()
  })

  it('cannot be cracked offline from the readable payload (regression)', async () => {
    const { signSetupToken } = await import('@/lib/account-setup-otp')
    const token = await signSetupToken('user_1', 'a@b.c', '123456')
    const { otpHash } = decodeJwt(token) as { otpHash: string }
    // The old scheme stored sha256(otp); a 1M-candidate loop would find it instantly
    expect(otpHash).not.toBe(crypto.createHash('sha256').update('123456').digest('hex'))
    expect(otpHash).not.toContain('123456')
  })

  it('rejects a token signed with another secret or tampered with', async () => {
    const { signSetupToken, verifySetupToken } = await import('@/lib/account-setup-otp')
    const token = await signSetupToken('user_1', 'a@b.c', '111111')
    const [h, p, sig] = token.split('.')
    const forged = JSON.parse(Buffer.from(p, 'base64url').toString())
    forged.uid = 'super_admin'
    const tampered = [h, Buffer.from(JSON.stringify(forged)).toString('base64url'), sig].join('.')
    expect(await verifySetupToken(tampered, '111111')).toBeNull()
  })

  it('generates 6-digit codes', async () => {
    const { generateOtp } = await import('@/lib/account-setup-otp')
    for (let i = 0; i < 50; i++) expect(generateOtp()).toMatch(/^\d{6}$/)
  })
})

describe('escapeHtml', () => {
  it('neutralises markup in names before they go into emails', async () => {
    const { escapeHtml } = await import('@/lib/email')
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
    expect(escapeHtml("O'Brien & Co")).toBe('O&#39;Brien &amp; Co')
    expect(escapeHtml(null)).toBe('')
  })
})
