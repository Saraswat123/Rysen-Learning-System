export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensurePasswordColumns } from '@/lib/password'
import { generateOtp, signSetupToken } from '@/lib/account-setup-otp'
import { Role } from '@/app/generated/prisma/client'

// Step 1 of first-time setup — proves the requester actually owns the email on
// file (old flow only checked name+email strings matched, which anyone who
// knew those two public-ish facts could pass). Sends a 6-digit code; the
// signed token carries only its hash, never the code itself.
export async function POST(req: NextRequest) {
  try {
    await ensurePasswordColumns()
    const { name, email } = await req.json()
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() }, omit: { password: false } })
    const okMsg = 'If that account exists, a verification code was sent to its email.'

    // Don't reveal whether the account/email exists — same response shape either
    // way, including a decoy token that will just fail the next step like a wrong
    // code would, so account existence can't be inferred from the response.
    const qualifies = !!user && user.isActive && !user.password
      && (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN || user.role === Role.EDUCATOR || user.role === Role.PRINCIPAL)
      && user.name.toLowerCase().trim() === name.toLowerCase().trim()

    if (!qualifies) {
      const decoyToken = await signSetupToken('decoy', email.toLowerCase().trim(), generateOtp())
      return NextResponse.json({ ok: true, token: decoyToken, message: okMsg })
    }

    const otp = generateOtp()
    const token = await signSetupToken(user!.id, user!.email, otp)

    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(resendKey)
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
          to: user!.email,
          subject: 'Your RYSEN account verification code',
          html: `<div style="font-family:sans-serif;padding:20px"><h2 style="color:#033D4C">RYSEN Account Setup</h2><p>Hi <b>${user!.name}</b>, use this code to finish setting up your account:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px;color:#033D4C">${otp}</p><p style="color:#666;font-size:13px">Expires in 10 minutes. If you didn't request this, ignore this email.</p></div>`,
        })
      } catch (err) {
        console.error('[request-setup-otp] email send failed', err)
      }
    } else {
      console.error('[request-setup-otp] RESEND_API_KEY not configured — cannot send OTP email')
    }

    return NextResponse.json({ ok: true, token, message: 'If that account exists, a verification code was sent to its email.' })
  } catch (err) {
    console.error('[request-setup-otp]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
