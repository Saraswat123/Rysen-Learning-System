import { Role } from '@/app/generated/prisma/client'
import { sendEmail } from './email'

// Login page per role — the welcome link lands them on the real sign-in page
// with "First-time Setup" preselected, NOT a magic link that logs them in.
// A magic link in an email would bypass the OTP email-ownership check built
// into /api/auth/request-setup-otp; this keeps that protection intact.
function loginUrlFor(role: Role, appUrl: string): string {
  if (role === Role.ADMIN || role === Role.SUPER_ADMIN) return `${appUrl}/admin/login?setup=1`
  if (role === Role.PRINCIPAL) return `${appUrl}/principal/login?setup=1`
  return `${appUrl}/login?setup=1`
}

export async function sendWelcomeEmail(user: { name: string; email: string; role: Role }): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${process.env.VERCEL_URL ?? 'rysen-learning-centre.vercel.app'}`
  const loginUrl = loginUrlFor(user.role, appUrl)

  return sendEmail(
    user.email,
    'Welcome to RYSEN Learning Centre — Activate Your Account',
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#fff">
      <h1 style="color:#033D4C;font-size:20px">Welcome to RYSEN Learning Centre 👋</h1>
      <p style="color:#40403E;font-size:15px;line-height:1.5">Hi <b>${user.name}</b>,</p>
      <p style="color:#40403E;font-size:15px;line-height:1.5">Your account is ready. Click below to activate it and set your password — you'll verify your email with a one-time code, then you're in.</p>
      <a href="${loginUrl}" style="display:inline-block;margin:20px 0;background:#033D4C;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Login to Your Account →</a>
      <p style="color:#999;font-size:12px;margin-top:24px">RYSEN Group of Schools · Rise To Success</p>
    </div>`,
  )
}
