'use client'

import { useState, useEffect } from 'react'
import { Users, BookOpen, Award, TrendingUp, ChevronRight, School, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface StageWithProgress {
  id: string; number: number; title: string; week: string
  isPublished: boolean; _count: { questions: number }
}

interface Educator {
  id: string; name: string
  branch: { name: string } | null
  progress: { passed: boolean }[]
}

export default function AdminDashboard() {
  const [stages, setStages] = useState<StageWithProgress[]>([])
  const [educators, setEducators] = useState<Educator[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/stages').then((r) => r.json()).catch(() => []),
      fetch('/api/educators').then((r) => r.json()).catch(() => []),
    ]).then(([s, e]) => {
      setStages(Array.isArray(s) ? s : [])
      setEducators(Array.isArray(e) ? e : [])
    }).finally(() => setLoading(false))
  }, [])

  const totalEducators = educators.length
  const completed = educators.filter((e) => e.progress.length > 0 && e.progress.every((p) => p.passed)).length
  const inProgress = educators.filter((e) => e.progress.length > 0 && !e.progress.every((p) => p.passed)).length
  const publishedStages = stages.filter((s) => s.isPublished).length

  const stats = [
    { label: 'Total Educators', value: totalEducators, icon: Users, color: 'bg-midnight text-white' },
    { label: 'Certified', value: completed, icon: Award, color: 'bg-forest text-white' },
    { label: 'In Progress', value: inProgress, icon: TrendingUp, color: 'bg-gold text-midnight' },
    { label: 'Active Stages', value: publishedStages, icon: BookOpen, color: 'bg-olive text-white' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-midnight">Dashboard</h1>
        <p className="text-charcoal/60 text-sm mt-1">RYSEN Learning Centre — Overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-2xl p-5 ${s.color}`}>
            <s.icon size={22} className="mb-3 opacity-80" />
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-sm opacity-75 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Link href="/admin/students" className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 hover:border-midnight/30 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-midnight/5 flex items-center justify-center flex-shrink-0"><School size={20} className="text-midnight" /></div>
          <div><p className="font-semibold text-midnight text-sm">Manage Students</p><p className="text-xs text-charcoal/50">Add, view, export</p></div>
          <ChevronRight size={16} className="text-charcoal/30 ml-auto" />
        </Link>
        <Link href="/admin/student-tests" className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 hover:border-midnight/30 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-olive/10 flex items-center justify-center flex-shrink-0"><BookOpen size={20} className="text-olive" /></div>
          <div><p className="font-semibold text-midnight text-sm">Student Tests</p><p className="text-xs text-charcoal/50">Create Q sets</p></div>
          <ChevronRight size={16} className="text-charcoal/30 ml-auto" />
        </Link>
        <a href="/student/login" target="_blank" rel="noreferrer" className="bg-gold/10 rounded-2xl border border-gold/30 p-4 flex items-center gap-3 hover:bg-gold/20 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center flex-shrink-0"><ExternalLink size={20} className="text-midnight" /></div>
          <div><p className="font-semibold text-midnight text-sm">Student Portal</p><p className="text-xs text-charcoal/50">Open login page</p></div>
          <ExternalLink size={14} className="text-charcoal/30 ml-auto" />
        </a>
      </div>

      {/* Stages Overview */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-midnight">Training Stages</h2>
          <Link href="/admin/stages" className="text-sm text-forest font-medium flex items-center gap-1 hover:underline">
            Manage <ChevronRight size={16} />
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          {stages.map((stage) => (
            <div key={stage.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-midnight text-white text-sm font-bold flex items-center justify-center">
                  {stage.number}
                </div>
                <div>
                  <p className="text-sm font-semibold text-charcoal">{stage.title}</p>
                  <p className="text-xs text-charcoal/50">{stage.week ? `${stage.week} · ` : ''}{stage._count.questions} questions</p>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${stage.isPublished ? 'bg-forest/10 text-forest' : 'bg-gray-100 text-gray-500'}`}>
                {stage.isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
          ))}
          {stages.length === 0 && <p className="text-sm text-charcoal/40 text-center py-4">No stages yet.</p>}
        </div>
      </div>

      {/* Recent Educators */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-midnight">Recent Educators</h2>
          <Link href="/admin/educators" className="text-sm text-forest font-medium flex items-center gap-1 hover:underline">
            View All <ChevronRight size={16} />
          </Link>
        </div>
        {educators.slice(0, 5).map((e) => (
          <div key={e.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-semibold text-charcoal">{e.name}</p>
              <p className="text-xs text-charcoal/50">{e.branch?.name ?? 'No branch'}</p>
            </div>
            <div className="text-xs text-charcoal/50">
              {e.progress.filter((p) => p.passed).length} stages passed
            </div>
          </div>
        ))}
        {educators.length === 0 && (
          <p className="text-sm text-charcoal/40 text-center py-6">No educators added yet.</p>
        )}
      </div>
    </div>
  )
}
