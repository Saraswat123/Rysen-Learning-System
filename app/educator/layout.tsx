'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import RysenLogo from '@/components/RysenLogo'
import {
  LayoutDashboard, Award, Trophy, LogOut, School, ClipboardList, ChevronDown,
  ListTodo, UserCircle, FolderOpen, Users, Layers, BarChart3, TrendingUp, Bot, Menu, Star,
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'

// Left-sidebar nav, grouped the way an educator actually uses it — same
// collapsible-group pattern as the admin side. Routes are unchanged; this is
// nav structure only, plus the new Student Programs page under Programs.
const NAV_GROUPS: { label: string; items: { href: string; label: string; icon: typeof LayoutDashboard; external?: boolean }[] }[] = [
  { label: '', items: [{ href: '/educator/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    label: 'Students',
    items: [
      { href: '/educator/students', label: 'Manage Students', icon: School },
      { href: '/educator/student-tests', label: 'Student Tests', icon: ClipboardList },
      { href: '/educator/results', label: 'Student Results', icon: Award },
      { href: '/educator/students/progress', label: 'Student Progress', icon: BarChart3 },
      { href: '/educator/analytics', label: 'Class Analytics', icon: TrendingUp },
      { href: '/student/leaderboard', label: 'Student Leaderboard ↗', icon: Trophy, external: true },
    ],
  },
  {
    label: 'Programs',
    items: [
      { href: '/educator/programs', label: 'Training Programs', icon: Layers },
      { href: '/educator/student-programs', label: 'Student Programs', icon: Layers },
    ],
  },
  { label: '', items: [{ href: '/educator/groups', label: 'My Groups', icon: Users }] },
  { label: '', items: [{ href: '/educator/ai-assistant', label: 'Rysen AI', icon: Bot }] },
  {
    label: 'Operations',
    items: [
      { href: '/educator/tasks', label: 'My Tasks', icon: ListTodo },
      { href: '/educator/resources', label: 'Resources', icon: FolderOpen },
    ],
  },
  {
    label: 'Achievements',
    items: [
      { href: '/educator/recognition', label: 'Recognition & Monthly Scores', icon: Trophy },
      { href: '/educator/star-students', label: 'Star Students', icon: Star },
      { href: '/leaderboard', label: 'Campus Leaderboard', icon: Users },
      { href: '/educator/certificate', label: 'Training Certificate', icon: Award },
    ],
  },
  { label: '', items: [{ href: '/educator/profile', label: 'Profile', icon: UserCircle }] },
]

export default function EducatorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<{ name: string; branch: { name: string } | null } | null>(null)
  const [open, setOpen] = useState(false)

  const activeGroupLabel = NAV_GROUPS.find((g) => g.items.some((i) => !i.external && pathname.startsWith(i.href)))?.label ?? ''
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set([activeGroupLabel]))

  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  useEffect(() => {
    fetch('/api/auth/me').then((r) => {
      if (!r.ok) { router.push('/login'); return }
      return r.json()
    }).then((d) => d && setUser(d.user))
  }, [router])

  useEffect(() => { setOpen(false) }, [pathname])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const sidebar = (
    <aside className={`fixed inset-y-0 left-0 z-40 w-60 bg-midnight flex flex-col transform transition-transform lg:relative lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-6 border-b border-white/10">
        <RysenLogo size="sm" light />
      </div>

      <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
        {NAV_GROUPS.map((group, gi) => {
          if (!group.label) {
            return group.items.map((item) => {
              const active = item.external ? false : pathname.startsWith(item.href)
              const Comp = item.external ? 'a' : Link
              return (
                <Comp key={item.href} href={item.href} onClick={() => setOpen(false)}
                  {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-gold text-midnight' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                  <item.icon size={18} />
                  {item.label}
                </Comp>
              )
            })
          }
          const isOpen = openGroups.has(group.label)
          const groupActive = group.items.some((i) => !i.external && pathname.startsWith(i.href))
          return (
            <div key={`${group.label}-${gi}`} className="mt-1">
              <button
                onClick={() => toggleGroup(group.label)}
                className={`w-full flex items-center justify-between px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors ${groupActive ? 'text-gold' : 'text-white/40 hover:text-white/70'}`}>
                {group.label}
                <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="flex flex-col gap-1 mt-1">
                  {group.items.map((item) => {
                    const active = item.external ? false : pathname.startsWith(item.href)
                    const Comp = item.external ? 'a' : Link
                    return (
                      <Comp key={item.href} href={item.href} onClick={() => setOpen(false)}
                        {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                        className={`flex items-center gap-3 pl-6 pr-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-gold text-midnight' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                        <item.icon size={16} />
                        {item.label}
                      </Comp>
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
            <p className="text-white/40 text-xs">{user.branch?.name}</p>
          </div>
        )}
        <button onClick={logout} className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen flex bg-cream">
      {sidebar}
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-midnight border-b border-white/10 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setOpen(true)} className="lg:hidden"><Menu size={22} className="text-white" /></button>
          <div className="lg:hidden"><RysenLogo size="sm" light /></div>
          <div className="flex-1" />
          <NotificationBell taskPath="/educator/tasks" />
        </header>
        <main className="flex-1 p-6 lg:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}
