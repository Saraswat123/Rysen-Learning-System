'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import RysenLogo from '@/components/RysenLogo'
import { ClipboardList, Trophy, LogOut, Menu, X } from 'lucide-react'

const NAV = [
  { href: '/student/dashboard', label: 'My Tests', icon: ClipboardList },
  { href: '/student/leaderboard', label: 'Leaderboard', icon: Trophy },
]

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [student, setStudent] = useState<{ name: string; class: string; section: string; branch?: { name: string } | null } | null>(null)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/student-me').then(async (r) => {
      if (!r.ok) {
        setReady(true)
        router.push('/student/login')
        return
      }
      const d = await r.json()
      setStudent(d.student)
      setReady(true)
    })
  }, [router])

  async function logout() {
    await fetch('/api/auth/student-logout', { method: 'POST' })
    router.push('/student/login')
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-30 bg-midnight text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => setOpen(!open)} className="lg:hidden">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div className="flex items-center gap-3 flex-1">
          <RysenLogo size="sm" light />
          <span className="text-xs text-white/50 hidden sm:inline">Student Portal</span>
        </div>
        {student && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold leading-tight">{student.name}</p>
              <p className="text-xs text-white/50">Class {student.class}{student.section ? ` - ${student.section}` : ''}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-midnight text-sm font-bold flex-shrink-0">
              {student.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed lg:static inset-y-0 left-0 z-20 w-56 bg-white border-r border-gray-100 pt-16 lg:pt-4 flex flex-col transform transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          <nav className="p-4 flex flex-col gap-1">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href)
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-midnight text-white' : 'text-charcoal/70 hover:text-midnight hover:bg-midnight/5'}`}>
                  <item.icon size={17} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="mt-auto p-4 border-t border-gray-100">
            {student?.branch?.name && <p className="text-xs text-charcoal/40 px-4 mb-2">{student.branch.name}</p>}
            <button onClick={logout}
              className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-sm font-medium text-charcoal/60 hover:text-midnight hover:bg-midnight/5 transition-colors">
              <LogOut size={17} /> Sign Out
            </button>
          </div>
        </aside>

        {open && <div className="fixed inset-0 z-10 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
