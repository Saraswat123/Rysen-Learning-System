// Cloudflare Turnstile server-side verification. If TURNSTILE_SECRET_KEY isn't
// configured yet, this is a no-op (returns true) so login keeps working during
// rollout — once the key is set in Vercel, every login route below enforces it.
export async function verifyTurnstile(token: string | undefined, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  if (!token) return false

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
    })
    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}
