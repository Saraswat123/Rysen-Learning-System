'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import RysenLogo from '@/components/RysenLogo'
import { LayoutDashboard, Award, LogOut } from 'lucide-react'

export default function EducatorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; branch: { name: string } | null } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then((r) => {
      if (!r.ok) { router.push('/login'); return }
      return r.json()
    }).then((d) => d && setUser(d.user))
  }, [router])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Top Nav */}
      <header className="bg-midnight sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <RysenLogo size="sm" light />
            <nav className="hidden sm:flex items-center gap-1">
              <Link href="/educator/dashboard" className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <LayoutDashboard size={15} /> Journey
              </Link>
              <Link href="/educator/certificate" className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <Award size={15} /> Certificate
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:block text-right">
                <p className="text-white text-sm font-medium">{user.name}</p>
                <p className="text-white/40 text-xs">{user.branch?.name}</p>
              </div>
            )}
            <button onClick={logout} className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
