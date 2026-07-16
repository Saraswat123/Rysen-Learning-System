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

  for (const target of targets) {
    const edu = educators.find((e) => e.id === target.userId)
    if (!edu) continue

    const result: (typeof results)[0] = { userId: edu.id, name: edu.name }
    const message = customMessage
      ? `${customMessage}\n\nTask: ${task.title}\nView here: ${taskUrl}`
      : `Hi ${edu.name}, this is a reminder for your task:\n\n*${task.title}*\n${task.description ? task.description + '\n' : ''}Priority: ${task.priority}\nDeadline: ${deadlineStr}\n\nView & complete your task: ${taskUrl}`

    // ── Email ──────────────────────────────────────────────────────────────
    if (target.channels.includes('email') && edu.email) {
      result.email = edu.email
      try {
        const resendKey = process.env.RESEND_API_KEY
        if (!resendKey) {
          result.emailError = 'RESEND_API_KEY not configured'
        } else {
          const { Resend } = await import('resend')
          const resend = new Resend(resendKey)
          const { error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL ?? 'RYSEN Learning Centre <noreply@rysengroup.com>',
            to: edu.email,
            subject: `Task Reminder: ${task.title}`,
            html: `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background:#f9f9f9;margin:0;padding:20px">
<div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <div style="background:#033D4C;padding:28px 32px">
    <h1 style="color:#FECB08;margin:0;font-size:22px;font-weight:700">RYSEN Learning Centre</h1>
    <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:13px">Task Reminder</p>
  </div>
  <div style="padding:32px">
    <p style="color:#40403E;font-size:15px;margin:0 0 8px">Hi <strong>${edu.name}</strong>,</p>
    <p style="color:#40403E;font-size:14px;margin:0 0 24px">You have a pending task assigned to you${customMessage ? ':' : '. Please complete it before the deadline.'}</p>
    ${customMessage ? `<p style="color:#40403E;font-size:14px;background:#f5f5f5;padding:12px 16px;border-radius:8px;border-left:3px solid #033D4C">${customMessage}</p>` : ''}
    <div style="background:#f5f9fc;border:1px solid #e0ecf0;border-radius:12px;padding:20px;margin:20px 0">
      <h2 style="color:#033D4C;font-size:18px;margin:0 0 8px">${task.title}</h2>
      ${task.description ? `<p style="color:#666;font-size:13px;margin:0 0 12px">${task.description}</p>` : ''}
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <span style="font-size:12px;font-weight:600;background:${task.priority === 'HIGH' ? '#fee2e2' : task.priority === 'LOW' ? '#f3f4f6' : '#e0ecf0'};color:${task.priority === 'HIGH' ? '#dc2626' : task.priority === 'LOW' ? '#6b7280' : '#033D4C'};padding:4px 10px;border-radius:99px">${task.priority} PRIORITY</span>
        <span style="font-size:12px;color:#666;padding:4px 0">📅 ${deadlineStr}</span>
      </div>
    </div>
    <a href="${taskUrl}" style="display:inline-block;background:#033D4C;color:white;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:14px">View Task →</a>
    <p style="color:#999;font-size:12px;margin:24px 0 0">Or copy this link: ${taskUrl}</p>
  </div>
  <div style="background:#f5f5f5;padding:16px 32px;text-align:center">
    <p style="color:#999;font-size:11px;margin:0">RYSEN Group of Schools · Learning Centre</p>
  </div>
</div>
</body>
</html>`,
          })
          result.emailSent = !error
          if (error) result.emailError = error.message
        }
      } catch (e) {
        result.emailError = String(e)
      }
    }

    // ── WhatsApp (wa.me link — no API required) ───────────────────────────
    if (target.channels.includes('whatsapp')) {
      const phone = edu.phone?.replace(/\D/g, '')
      if (phone) {
        result.whatsappLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      } else {
        result.whatsapp = 'no_phone'
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
