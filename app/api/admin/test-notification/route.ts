export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { email, phone } = await req.json() as { email?: string; phone?: string }

  const results: { channel: string; status: 'sent' | 'error' | 'skipped' | 'link'; detail: string; link?: string }[] = []

  // ── Test Email ────────────────────────────────────────────────────────────
  if (email?.trim()) {
    const resendKey = process.env.RESEND_API_KEY
    const fromAddr = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
    if (!resendKey) {
      results.push({ channel: 'email', status: 'error', detail: 'RESEND_API_KEY not set in environment' })
    } else {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(resendKey)
        const { error } = await resend.emails.send({
          from: fromAddr,
          to: email.trim(),
          subject: '✅ RYSEN – Test Email',
          html: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f9f9f9;margin:0;padding:20px">
<div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <div style="background:#033D4C;padding:28px 32px">
    <h1 style="color:#FECB08;margin:0;font-size:22px;font-weight:700">RYSEN Learning Centre</h1>
    <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:13px">Test Notification</p>
  </div>
  <div style="padding:32px">
    <p style="color:#40403E;font-size:16px;margin:0 0 12px">✅ Email is working!</p>
    <p style="color:#40403E;font-size:14px">This is a test email from RYSEN Learning Centre admin panel.</p>
    <p style="color:#888;font-size:12px;margin-top:24px">Sent from: ${fromAddr}<br/>Sent by: ${user.name}</p>
  </div>
</div></body></html>`,
        })
        if (error) {
          results.push({ channel: 'email', status: 'error', detail: error.message })
        } else {
          results.push({ channel: 'email', status: 'sent', detail: `Delivered to ${email.trim()}` })
        }
      } catch (e) {
        results.push({ channel: 'email', status: 'error', detail: String(e) })
      }
    }
  } else {
    results.push({ channel: 'email', status: 'skipped', detail: 'No email provided' })
  }

  // ── Test WhatsApp (wa.me link) ────────────────────────────────────────────
  if (phone?.trim()) {
    const raw = phone.replace(/\D/g, '')
    const e164 = raw.startsWith('91') && raw.length === 12 ? raw : `91${raw}`
    const msg = `✅ RYSEN Test Message\n\nHi! This is a test WhatsApp notification from RYSEN Learning Centre admin panel.\n\nIf you received this, WhatsApp reminders are working correctly.\n\n— Sent by ${user.name}`
    const link = `https://wa.me/${e164}?text=${encodeURIComponent(msg)}`
    results.push({ channel: 'whatsapp', status: 'link', detail: `+${e164}`, link })
  } else {
    results.push({ channel: 'whatsapp', status: 'skipped', detail: 'No phone provided' })
  }

  return NextResponse.json({ ok: true, results })
}
