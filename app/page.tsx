import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

export default async function RootPage() {
  const user = await getSession()
  if (!user) redirect('/login')
  if (user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN) redirect('/admin/dashboard')
  redirect('/educator/dashboard')
}
