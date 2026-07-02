'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import RysenLogo from '@/components/RysenLogo'
import { LayoutDashboard, Award, Trophy, LogOut, School, ClipboardList, ChevronDown } from 'lucide-react'

export default function EducatorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<{ name: string; branch: { name: string } | null } | null>(null)
  const [studentsOpen, setStudentsOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then((r) => {
      if (!r.ok) { router.push('/login'); return }
      return r.json()
    }).then((d) => d && setUser(d.user))
  }, [router])

  // Close dropdown when navigating away from student section
  useEffect(() => {
    if (!pathname.startsWith('/educator/student')) setStudentsOpen(false)
  }, [pathname])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const inStudents = pathname.startsWith('/educator/student')

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-midnight sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <RysenLogo size="sm" light />
            <nav className="hidden sm:flex items-center gap-1">
              <Link href="/educator/dashboard"
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${pathname === '/educator/dashboard' ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                <LayoutDashboard size={15} /> My Journey
              </Link>

              {/* Students dropdown */}
              <div className="relative">
                <button
                  onClick={() => setStudentsOpen((v) => !v)}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${inStudents ? 'bg-gold text-midnight font-semibold' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                  <School size={15} /> Students <ChevronDown size={13} className={`transition-transform ${studentsOpen ? 'rotate-180' : ''}`} />
                </button>
                {studentsOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                    <Link href="/educator/students" onClick={() => setStudentsOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-charcoal hover:bg-midnight/5 hover:text-midnight transition-colors">
                      <School size={15} className="text-midnight/50" /> Manage Students
                    </Link>
                    <Link href="/educator/student-tests" onClick={() => setStudentsOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-charcoal hover:bg-midnight/5 hover:text-midnight transition-colors">
                      <ClipboardList size={15} className="text-midnight/50" /> Student Tests
                    </Link>
                    <div className="border-t border-gray-100 my-1" />
                    <a href="/student/leaderboard" target="_blank" rel="noreferrer"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-charcoal hover:bg-midnight/5 hover:text-midnight transition-colors">
                      <Trophy size={15} className="text-midnight/50" /> Student Leaderboard ↗
                    </a>
                  </div>
                )}
              </div>

              <Link href="/educator/certificate"
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${pathname === '/educator/certificate' ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                <Award size={15} /> Certificate
              </Link>
              <Link href="/leaderboard"
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${pathname === '/leaderboard' ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                <Trophy size={15} /> Leaderboard
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
            {/* Mobile: Students shortcut */}
            <Link href="/educator/student-tests" className="sm:hidden text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Student Tests">
              <ClipboardList size={18} />
            </Link>
            <button onClick={logout} className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Click outside to close dropdown */}
      {studentsOpen && <div className="fixed inset-0 z-10" onClick={() => setStudentsOpen(false)} />}

      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
