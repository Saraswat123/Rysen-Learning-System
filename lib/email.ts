// Single email-sending entry point for the whole app. Brevo first (300/day
// free, better deliverability to corporate Gmail/Workspace than an unverified
// Resend sender), falls back to Resend if Brevo isn't configured yet — so
// nothing breaks while BREVO_API_KEY is being set up.
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const brevoKey = process.env.BREVO_API_KEY
  if (brevoKey) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': brevoKey },
        body: JSON.stringify({
          sender: {
            name: process.env.BREVO_FROM_NAME ?? 'RYSEN Learning Centre',
            email: process.env.BREVO_FROM_EMAIL ?? 'onboarding@resend.dev',
          },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      })
      if (res.ok) return true
      console.error('[sendEmail] Brevo failed', res.status, await res.text().catch(() => ''))
      // fall through to Resend if configured
    } catch (err) {
      console.error('[sendEmail] Brevo error', err)
    }
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return false
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(resendKey)
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
      to, subject, html,
    })
    if (error) { console.error('[sendEmail] Resend failed', error); return false }
    return true
  } catch (err) {
    console.error('[sendEmail] Resend error', err)
    return false
  }
}
