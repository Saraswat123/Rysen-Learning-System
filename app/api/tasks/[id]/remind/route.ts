export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

interface RemindTarget { userId: string; channels: ('email' | 'whatsapp')[] }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id: taskId } = await params
  const { targets, customMessage }: { targets: RemindTarget[]; customMessage?: string } = await req.json()

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { title: true, description: true, deadline: true, priority: true },
  })
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  const taskTitle = task.title
  const taskDescription = task.description
  const taskPriority = task.priority

  const userIds = targets.map((t) => t.userId)
  const educators = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, phone: true },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://rysen-learning-centre.vercel.app'

  const taskUrl = `${appUrl}/educator/tasks/${taskId}`
  const deadlineStr = task.deadline
    ? new Date(task.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'No deadline set'

  const results: { userId: string; name: string; email?: string; whatsapp?: string; emailSent?: boolean; emailError?: string; whatsappLink?: string }[] = []

  function buildEmailHtml(name: string) {
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f9f9f9;margin:0;padding:20px">
<div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <div style="background:#033D4C;padding:28px 32px">
    <h1 style="color:#FECB08;margin:0;font-size:22px;font-weight:700">RYSEN Learning Centre</h1>
    <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:13px">Task Reminder</p>
  </div>
  <div style="padding:32px">
    <p style="color:#40403E;font-size:15px;margin:0 0 8px">Hi <strong>${name}</strong>,</p>
    <p style="color:#40403E;font-size:14px;margin:0 0 24px">You have a pending task${customMessage ? ':' : '. Please complete it before the deadline.'}</p>
    ${customMessage ? `<p style="color:#40403E;font-size:14px;background:#f5f5f5;padding:12px 16px;border-radius:8px;border-left:3px solid #033D4C">${customMessage}</p>` : ''}
    <div style="background:#f5f9fc;border:1px solid #e0ecf0;border-radius:12px;padding:20px;margin:20px 0">
      <h2 style="color:#033D4C;font-size:18px;margin:0 0 8px">${taskTitle}</h2>
      ${taskDescription ? `<p style="color:#666;font-size:13px;margin:0 0 12px">${taskDescription}</p>` : ''}
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <span style="font-size:12px;font-weight:600;background:${taskPriority === 'HIGH' ? '#fee2e2' : taskPriority === 'LOW' ? '#f3f4f6' : '#e0ecf0'};color:${taskPriority === 'HIGH' ? '#dc2626' : taskPriority === 'LOW' ? '#6b7280' : '#033D4C'};padding:4px 10px;border-radius:99px">${taskPriority} PRIORITY</span>
        <span style="font-size:12px;color:#666;padding:4px 0">📅 ${deadlineStr}</span>
      </div>
    </div>
    <a href="${taskUrl}" style="display:inline-block;background:#033D4C;color:white;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:14px">View Task →</a>
  </div>
  <div style="background:#f5f5f5;padding:16px 32px;text-align:center">
    <p style="color:#999;font-size:11px;margin:0">RYSEN Group of Schools · Learning Centre</p>
  </div>
</div></body></html>`
  }

  // ── Batch email via Resend (one API call for all recipients) ──────────────
  const emailTargets = targets.filter((t) => t.channels.includes('email'))
  const resendKey = process.env.RESEND_API_KEY
  const fromAddr = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

  if (emailTargets.length > 0 && resendKey) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(resendKey)
      const emailPayloads = emailTargets
        .map((t) => educators.find((e) => e.id === t.userId))
        .filter((e): e is NonNullable<typeof e> => !!e?.email)
        .map((edu) => ({
          from: fromAddr,
          to: edu.email!,
          subject: `Task Reminder: ${task.title}`,
          html: buildEmailHtml(edu.name),
        }))

      // Resend batch: up to 100 emails per call, no per-email rate limit
      const BATCH = 100
      for (let i = 0; i < emailPayloads.length; i += BATCH) {
        const chunk = emailPayloads.slice(i, i + BATCH)
        const { error } = await resend.batch.send(chunk)
        for (const payload of chunk) {
          const edu = educators.find((e) => e.email === payload.to)!
          const idx = results.findIndex((r) => r.userId === edu.id)
          if (idx === -1) {
            results.push({ userId: edu.id, name: edu.name, email: edu.email!, emailSent: !error, emailError: error?.message })
          } else {
            results[idx].emailSent = !error
            if (error) results[idx].emailError = error.message
          }
        }
        if (i + BATCH < emailPayloads.length) await new Promise((r) => setTimeout(r, 1100))
      }
    } catch (e) {
      for (const t of emailTargets) {
        const edu = educators.find((ex) => ex.id === t.userId)
        if (edu) results.push({ userId: edu.id, name: edu.name, email: edu.email ?? undefined, emailSent: false, emailError: String(e) })
      }
    }
  } else if (emailTargets.length > 0 && !resendKey) {
    for (const t of emailTargets) {
      const edu = educators.find((e) => e.id === t.userId)
      if (edu) results.push({ userId: edu.id, name: edu.name, emailSent: false, emailError: 'RESEND_API_KEY not set' })
    }
  }

  for (const target of targets) {
    const edu = educators.find((e) => e.id === target.userId)
    if (!edu) continue

    let result = results.find((r) => r.userId === edu.id)
    if (!result) { result = { userId: edu.id, name: edu.name }; results.push(result) }

    const message = customMessage
      ? `${customMessage}\n\nTask: ${task.title}\nView here: ${taskUrl}`
      : `Hi ${edu.name}, reminder:\n\n*${task.title}*\nDeadline: ${deadlineStr}\n\nView: ${taskUrl}`

    // ── WhatsApp via Twilio ───────────────────────────────────────────────
    if (target.channels.includes('whatsapp')) {
      const rawPhone = edu.phone?.replace(/\D/g, '')
      if (!rawPhone) {
        result.whatsapp = 'no_phone'
      } else {
        // Normalise to E.164 — prepend +91 if no country code
        const e164 = rawPhone.startsWith('91') && rawPhone.length === 12
          ? `+${rawPhone}`
          : rawPhone.startsWith('+')
          ? rawPhone
          : `+91${rawPhone}`

        const twilioSid = process.env.TWILIO_ACCOUNT_SID
        const twilioToken = process.env.TWILIO_AUTH_TOKEN
        const twilioFrom = process.env.TWILIO_WHATSAPP_FROM // e.g. whatsapp:+14155238886

        if (!twilioSid || !twilioToken || !twilioFrom) {
          // Fallback to wa.me link if Twilio not configured
          result.whatsappLink = `https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`
          result.whatsapp = 'link_only'
        } else {
          try {
            const twilio = (await import('twilio')).default
            const client = twilio(twilioSid, twilioToken)
            await client.messages.create({
              from: twilioFrom,
              to: `whatsapp:${e164}`,
              body: message,
            })
            result.whatsapp = 'sent'
          } catch (e) {
            result.whatsapp = `error:${String(e)}`
            // Still give manual fallback link
            result.whatsappLink = `https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`
          }
        }
      }
    }

    // Save in-app notification
    await db.notification.create({
      data: {
        userId: edu.id,
        title: `Task Reminder: ${task.title}`,
        message: customMessage ?? `Reminder: Please complete "${task.title}" before ${deadlineStr}.`,
        type: 'TASK',
        relatedId: taskId,
      },
    })

    results.push(result)
  }

  return NextResponse.json({ ok: true, results })
}
