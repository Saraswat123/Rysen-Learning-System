'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, BookOpen, Users, Trophy, LogOut } from 'lucide-react'
import RysenLogo from '@/components/RysenLogo'

interface User { id: string; name: string; role: string; branch?: { name: string } | null }

export default function PrincipalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => {
      if (!d.user || d.user.role !== 'PRINCIPAL') { router.push('/principal/login'); return }
      setUser(d.user)
    })
  }, [router])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/principal/login')
  }

  if (pathname === '/principal/login') return <>{children}</>
  if (!user) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-olive border-t-transparent rounded-full animate-spin" /></div>

  const nav = [
    { href: '/principal/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/principal/my-journey', icon: BookOpen, label: 'My Journey' },
    { href: '/principal/campus', icon: Users, label: 'Campus Progress' },
    { href: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  ]

  return (
    <div className="min-h-screen bg-cream flex">
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col fixed h-full z-10">
        <div className="p-5 border-b border-gray-100">
          <RysenLogo />
          <div className="mt-3">
            <span className="text-xs bg-olive/20 text-olive px-2 py-0.5 rounded-full font-medium">Principal Portal</span>
          </div>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {nav.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-olive text-white' : 'text-charcoal/70 hover:bg-cream hover:text-midnight'}`}>
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="text-xs text-charcoal/50 mb-1 font-medium truncate">{user.name}</div>
          {user.branch && <div className="text-xs text-charcoal/40 mb-3 truncate">{user.branch.name}</div>}
          <button onClick={logout} className="flex items-center gap-2 text-xs text-charcoal/50 hover:text-red-500 transition-colors">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-60 p-8">{children}</main>
    </div>
  )
}
