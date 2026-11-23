import { afterEach, expect, it, vi } from 'vitest'
import { Role } from '@/app/generated/prisma/client'
import { sendEmail } from '@/lib/email'
import { sendWelcomeEmail } from '@/lib/welcome-email'

vi.mock('@/lib/email', async (original) => ({
  ...(await original<typeof import('@/lib/email')>()),
  sendEmail: vi.fn(async () => true),
}))

afterEach(() => vi.unstubAllEnvs())

it.each([
  [Role.ADMIN, '/admin/login'],
  [Role.PRINCIPAL, '/principal/login'],
  [Role.EDUCATOR, '/login'],
])('links %s to the current production setup page', async (role, path) => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
  vi.stubEnv('VERCEL_URL', 'old-build.example.test')
  await sendWelcomeEmail({ name: 'Test', email: 'staff@example.test', role })
  expect(vi.mocked(sendEmail).mock.lastCall?.[2]).toContain(
    `href="https://rysen-learning-system.vercel.app${path}?setup=1"`,
  )
})
