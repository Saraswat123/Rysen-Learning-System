export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { groupId, message, subject, channels, taskId } = await req.json() as {
    groupId: string
    message: string
    subject: string
    channels: ('email' | 'whatsapp')[]
    taskId?: string
  }

  if (!groupId || !message?.trim()) {
    return NextResponse.json({ error: 'Group and message required' }, { status: 400 })
  }

  // Optional task link
  let taskInfo: { title: string; deadline: string | null; priority: string; url: string } | null = null
  if (taskId) {
    const task = await db.task.findUnique({ where: { id: taskId }, select: { title: true, deadline: true, priority: true } })
    if (task) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${process.env.VERCEL_URL ?? 'rysen-learning-system.vercel.app'}`
      taskInfo = {
        title: task.title,
        deadline: task.deadline ? new Date(task.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : null,
        priority: task.priority,
        url: `${appUrl}/educator/tasks/${taskId}`,
      }
    }
  }

  const group = await db.educatorGroup.findUnique({
    where: { id: groupId },
    include: { members: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } } },
  })
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

  const members = group.members.map((m) => m.user)
  const emailResults: { name: string; email: string; sent: boolean; error?: string }[] = []
  const waLinks: { name: string; phone: string; link: string }[] = []

  // ── Email via Resend batch ────────────────────────────────────────────────
  if (channels.includes('email')) {
    const resendKey = process.env.RESEND_API_KEY
    const fromAddr = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
    const emailMembers = members.filter((m) => m.email)

    if (resendKey && emailMembers.length > 0) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(resendKey)
        const payloads = emailMembers.map((m) => ({
          from: fromAddr,
          to: m.email!,
          subject: subject?.trim() || 'Message from RYSEN Admin',
          html: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f9f9f9;margin:0;padding:20px">
<div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <div style="background:#033D4C;padding:28px 32px">
    <h1 style="color:#FECB08;margin:0;font-size:22px;font-weight:700">RYSEN Learning Centre</h1>
    <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:13px">${group.name}</p>
  </div>
  <div style="padding:32px">
    <p style="color:#40403E;font-size:15px;margin:0 0 8px">Hi <strong>${m.name}</strong>,</p>
    <div style="background:#f5f9fc;border-left:4px solid #033D4C;padding:16px 20px;border-radius:0 12px 12px 0;margin:16px 0;white-space:pre-wrap;color:#40403E;font-size:14px;line-height:1.6">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    ${taskInfo ? `<div style="margin-top:24px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <div style="background:#f8fafc;padding:12px 16px;border-bottom:1px solid #e2e8f0">
        <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Referenced Task</p>
      </div>
      <div style="padding:16px">
        <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#033D4C">${taskInfo.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        ${taskInfo.deadline ? `<p style="margin:4px 0;font-size:12px;color:#64748b">Due: ${taskInfo.deadline}</p>` : ''}
        <p style="margin:4px 0 12px;font-size:12px;color:#64748b">Priority: ${taskInfo.priority}</p>
        <a href="${taskInfo.url}" style="display:inline-block;background:#FECB08;color:#033D4C;font-weight:700;font-size:13px;padding:10px 20px;border-radius:8px;text-decoration:none">View Task →</a>
      </div>
    </div>` : ''}
  </div>
  <div style="background:#f5f5f5;padding:16px 32px;text-align:center">
    <p style="color:#999;font-size:11px;margin:0">RYSEN Group of Schools · Learning Centre</p>
  </div>
</div></body></html>`,
        }))

        const BATCH = 100
        for (let i = 0; i < payloads.length; i += BATCH) {
          const chunk = payloads.slice(i, i + BATCH)
          const { error } = await resend.batch.send(chunk)
          for (const p of chunk) {
            emailResults.push({ name: members.find((m) => m.email === p.to)?.name ?? '', email: p.to, sent: !error, error: error?.message })
          }
          if (i + BATCH < payloads.length) await new Promise((r) => setTimeout(r, 1100))
        }
      } catch (e) {
        for (const m of emailMembers) {
          emailResults.push({ name: m.name, email: m.email!, sent: false, error: String(e) })
        }
      }
    } else if (!resendKey) {
      for (const m of emailMembers) {
        emailResults.push({ name: m.name, email: m.email!, sent: false, error: 'RESEND_API_KEY not set' })
      }
    }
  }

  // ── WhatsApp wa.me links ─────────────────────────────────────────────────
  if (channels.includes('whatsapp')) {
    for (const m of members) {
      const raw = m.phone?.replace(/\D/g, '')
      if (!raw) continue
      const e164 = raw.startsWith('91') && raw.length === 12 ? raw : `91${raw}`
      const waText = taskInfo
        ? `${message}\n\n📌 Task: ${taskInfo.title}${taskInfo.deadline ? ` (Due: ${taskInfo.deadline})` : ''}\n🔗 ${taskInfo.url}`
        : message
      waLinks.push({
        name: m.name,
        phone: `+${e164}`,
        link: `https://wa.me/${e164}?text=${encodeURIComponent(waText)}`,
      })
    }
  }

  // ── In-app notifications ─────────────────────────────────────────────────
  await db.notification.createMany({
    data: members.map((m) => ({
      userId: m.id,
      title: subject?.trim() || 'Message from Admin',
      message,
      type: 'GENERAL',
    })),
  })

  return NextResponse.json({
    ok: true,
    group: group.name,
    total: members.length,
    emailResults,
    waLinks,
  })
}
