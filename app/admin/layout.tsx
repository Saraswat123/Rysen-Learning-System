'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import RysenLogo from '@/components/RysenLogo'
import {
  LayoutDashboard, Users, BookOpen, BarChart3,
  UserCog, LogOut, Menu, Trophy, GraduationCap, Layers, School, ClipboardList, FileSpreadsheet, ListTodo, PieChart, Sparkles, Building2, FolderOpen, Megaphone, Settings,
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/campuses', label: 'Campuses', icon: Building2 },
  { href: '/admin/educators', label: 'Educators', icon: Users },
  { href: '/admin/principals', label: 'Principals', icon: GraduationCap },
  { href: '/admin/programs', label: 'Programs', icon: Layers },
  { href: '/admin/stages', label: 'Stages & MCQ', icon: BookOpen },
  { href: '/admin/students', label: 'Students', icon: School },
  { href: '/admin/student-tests', label: 'Student Tests', icon: ClipboardList },
  { href: '/admin/test-results', label: 'Results Sheet', icon: FileSpreadsheet },
  { href: '/admin/tasks', label: 'Task Directory', icon: ListTodo },
  { href: '/admin/educator-groups', label: 'Educator Groups', icon: Users },
  { href: '/admin/resources', label: 'Resources', icon: FolderOpen },
  { href: '/admin/broadcasts', label: 'Broadcasts', icon: Megaphone },
  { href: '/admin/ai-assistant', label: 'RYSEN AI', icon: Sparkles },
  { href: '/admin/reports', label: 'Branch Reports', icon: PieChart },
  { href: '/admin/analytics', label: 'AI Analytics', icon: BarChart3 },
  { href: '/admin/admins', label: 'Admin Users', icon: UserCog },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<{ name: string; role: string } | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(async (r) => {
      if (!r.ok) {
        // Not logged in — show login page immediately, no migration needed
        setReady(true)
        router.push('/admin/login')
        return
      }
      const d = await r.json()
      setUser(d.user)
      // Run migration once per browser session; skip if already done
      if (!sessionStorage.getItem('rysen_migrated_v23')) {
        try {
          const ac = new AbortController()
          const t = setTimeout(() => ac.abort(), 12000)
          await fetch('/api/admin/migrate', { method: 'POST', signal: ac.signal })
          clearTimeout(t)
        } catch {}
        sessionStorage.setItem('rysen_migrated_v23', '1')
      }
      setReady(true)
    })
  }, [router])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const sidebar = (
    <aside className={`fixed inset-y-0 left-0 z-40 w-60 bg-midnight flex flex-col transform transition-transform lg:relative lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-6 border-b border-white/10">
        <RysenLogo size="sm" light />
      </div>

      <nav className="flex-1 p-4 flex flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-gold text-midnight' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        {user && (
          <div className="px-4 py-2 mb-2">
            <p className="text-white text-sm font-medium truncate">{user.name}</p>
            <p className="text-white/40 text-xs">{user.role.replace('_', ' ')}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  )

  if (!ready) {
    return (
      <div className="min-h-screen flex bg-cream">
        {sidebar}
        {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
            <button onClick={() => setOpen(true)}><Menu size={22} className="text-midnight" /></button>
            <RysenLogo size="sm" />
          </header>
          <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-charcoal/40">
              <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Setting up database…</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-cream">
      {sidebar}
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-midnight border-b border-white/10 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setOpen(true)} className="lg:hidden"><Menu size={22} className="text-white" /></button>
          <div className="lg:hidden"><RysenLogo size="sm" light /></div>
          <div className="flex-1" />
          <NotificationBell taskPath="/admin/tasks" />
        </header>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
