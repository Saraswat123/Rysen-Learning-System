'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import RysenLogo from '@/components/RysenLogo'
import {
  LayoutDashboard, Users, BookOpen, BarChart3,
  UserCog, LogOut, Menu, Trophy, GraduationCap, Layers, School, ClipboardList, FileSpreadsheet, ListTodo, PieChart, Sparkles, Building2, FolderOpen, Megaphone, Settings, History, Award, ChevronDown,
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'

// 3 primary pillars (Campuses / Programs / Students) match how the work
// actually flows: pick a campus, allocate programs to it, manage its
// students. Everything campus-scoped (educators, principals, stages & MCQ,
// tests, results) nests under its pillar instead of sitting flat in a
// 20-item list. Routes are unchanged — this is nav grouping only.
const NAV_GROUPS: { label: string; items: { href: string; label: string; icon: typeof LayoutDashboard }[] }[] = [
  { label: '', items: [{ href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    label: 'Campuses',
    items: [
      { href: '/admin/campuses', label: 'All Campuses', icon: Building2 },
      { href: '/admin/educators', label: 'Educators', icon: Users },
      { href: '/admin/principals', label: 'Principals', icon: GraduationCap },
    ],
  },
  {
    label: 'Programs',
    items: [
      { href: '/admin/programs', label: 'Programs', icon: Layers },
      { href: '/admin/stages', label: 'Stages & MCQ', icon: BookOpen },
    ],
  },
  {
    label: 'Students',
    items: [
      { href: '/admin/students', label: 'Roster', icon: School },
      { href: '/admin/student-tests', label: 'Test Creation', icon: ClipboardList },
      { href: '/admin/test-results', label: 'Result Sheet', icon: FileSpreadsheet },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/tasks', label: 'Task Directory', icon: ListTodo },
      { href: '/admin/task-history', label: 'Task History', icon: History },
      { href: '/admin/educator-groups', label: 'Educator Groups', icon: Users },
      { href: '/admin/rewards', label: 'Rewards & Achievements', icon: Award },
      { href: '/admin/resources', label: 'Resources', icon: FolderOpen },
      { href: '/admin/broadcasts', label: 'Broadcasts', icon: Megaphone },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/admin/ai-assistant', label: 'RYSEN AI', icon: Sparkles },
      { href: '/admin/reports', label: 'Branch Reports', icon: PieChart },
      { href: '/admin/analytics', label: 'AI Analytics', icon: BarChart3 },
      { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/admins', label: 'Admin Users', icon: UserCog },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<{ name: string; role: string } | null>(null)
  const [ready, setReady] = useState(false)

  const activeGroupLabel = NAV_GROUPS.find((g) => g.items.some((i) => pathname.startsWith(i.href)))?.label ?? ''
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set([activeGroupLabel]))

  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

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
      if (!sessionStorage.getItem('rysen_migrated_v26')) {
        try {
          const ac = new AbortController()
          const t = setTimeout(() => ac.abort(), 12000)
          await fetch('/api/admin/migrate', { method: 'POST', signal: ac.signal })
          clearTimeout(t)
        } catch {}
        sessionStorage.setItem('rysen_migrated_v26', '1')
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

      <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          if (!group.label) {
            // Ungrouped items (Dashboard) render flat, no header.
            return group.items.map((item) => {
              const active = pathname.startsWith(item.href)
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-gold text-midnight' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                  <item.icon size={18} />
                  {item.label}
                </Link>
              )
            })
          }
          const isOpen = openGroups.has(group.label)
          const groupActive = group.items.some((i) => pathname.startsWith(i.href))
          return (
            <div key={group.label} className="mt-1">
              <button
                onClick={() => toggleGroup(group.label)}
                className={`w-full flex items-center justify-between px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors ${groupActive ? 'text-gold' : 'text-white/40 hover:text-white/70'}`}>
                {group.label}
                <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="flex flex-col gap-1 mt-1">
                  {group.items.map((item) => {
                    const active = pathname.startsWith(item.href)
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 pl-6 pr-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-gold text-midnight' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                        <item.icon size={16} />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
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
