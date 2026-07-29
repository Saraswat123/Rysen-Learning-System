'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, TrendingUp, Users, CheckCircle, Search, ChevronDown, BarChart3, Clock, BookOpen, Target, Zap } from 'lucide-react'

interface SubjectStat { attempts: number; passed: number; avgScore: number }
interface StudentProgress {
  id: string; name: string; class: string; section: string; subject: string
  branch: { id: string; name: string } | null
  totalAttempts: number; uniqueTestsTried: number; totalTests: number
  passed: number; avgScore: number | null; bestScore: number | null
  lastAttempt: string | null; engagement: number
  bySubject: Record<string, SubjectStat>
  atRisk: boolean
}
interface Summary {
  totalStudents: number; avgScore: number | null
  avgEngagement: number; atRiskCount: number; totalTests: number
}

type SortKey = 'name' | 'avgScore' | 'engagement' | 'passed' | 'lastAttempt'

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-charcoal/30">No attempts</span>
  const color = score >= 70 ? 'bg-green-100 text-green-700' : score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{score}%</span>
}

function EngagementBar({ value }: { value: number }) {
  const color = value >= 60 ? 'bg-forest' : value >= 30 ? 'bg-gold' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs text-charcoal/50 w-8 text-right">{value}%</span>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ size: number; className?: string }>
  label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-charcoal/40 font-medium">{label}</p>
        <p className="text-2xl font-bold text-midnight mt-0.5">{value}</p>
        {sub && <p className="text-xs text-charcoal/40 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function timeAgo(iso: string | null) {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function StudentProgressPage() {
  const [data, setData] = useState<{ students: StudentProgress[]; summary: Summary } | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterRisk, setFilterRisk] = useState(false)
  const [sort, setSort] = useState<SortKey>('name')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/students/progress').then(r => r.json()).then(d => {
      if (d.students) setData(d)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!data || data.students.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 text-charcoal/30">
      <Users size={48} className="mb-4 opacity-20" />
      <p className="text-base font-medium">No students at your campus yet</p>
      <p className="text-sm mt-1">Add students in the Students section first</p>
    </div>
  )

  const { students, summary } = data
  const classes = Array.from(new Set(students.map(s => s.class))).sort()

  const filtered = students
    .filter(s => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
      if (filterClass && s.class !== filterClass) return false
      if (filterRisk && !s.atRisk) return false
      return true
    })
    .sort((a, b) => {
      if (sort === 'avgScore') return (b.avgScore ?? -1) - (a.avgScore ?? -1)
      if (sort === 'engagement') return b.engagement - a.engagement
      if (sort === 'passed') return b.passed - a.passed
      if (sort === 'lastAttempt') return new Date(b.lastAttempt ?? 0).getTime() - new Date(a.lastAttempt ?? 0).getTime()
      return a.name.localeCompare(b.name)
    })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-midnight flex items-center gap-2">
          <BarChart3 size={22} /> Student Progress
        </h1>
        <p className="text-sm text-charcoal/60 mt-0.5">Test performance, engagement and at-risk tracking for your campus students</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Students" value={summary.totalStudents} color="bg-midnight" />
        <StatCard icon={Target} label="Avg Score" value={summary.avgScore !== null ? `${summary.avgScore}%` : '—'} sub="across all tests" color="bg-forest" />
        <StatCard icon={Zap} label="Avg Engagement" value={`${summary.avgEngagement}%`} sub="tests attempted" color="bg-gold" />
        <StatCard icon={AlertTriangle} label="At Risk" value={summary.atRiskCount} sub="need attention" color="bg-red-400" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student…"
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight/20" />
        </div>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-midnight/20">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-midnight/20">
          <option value="name">Sort: Name</option>
          <option value="avgScore">Sort: Score ↓</option>
          <option value="engagement">Sort: Engagement ↓</option>
          <option value="passed">Sort: Tests Passed ↓</option>
          <option value="lastAttempt">Sort: Recent Activity</option>
        </select>
        <button onClick={() => setFilterRisk(v => !v)}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-colors ${filterRisk ? 'bg-red-500 text-white border-red-500' : 'border-gray-200 text-charcoal/60 hover:border-red-300 hover:text-red-500'}`}>
          <AlertTriangle size={12} /> At Risk Only
        </button>
      </div>

      {/* Student table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_40px] gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-charcoal/40 uppercase tracking-wider">
          <div>Student</div>
          <div>Avg Score</div>
          <div>Tests Passed</div>
          <div>Engagement</div>
          <div>Best Score</div>
          <div>Last Active</div>
          <div />
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-charcoal/30 text-sm">No students match filters</div>
        ) : filtered.map(s => (
          <div key={s.id} className={`border-b border-gray-50 last:border-0 ${s.atRisk ? 'bg-red-50/30' : ''}`}>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_40px] gap-3 px-5 py-3.5 items-center">
              {/* Name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white ${s.atRisk ? 'bg-red-400' : 'bg-midnight'}`}>
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm text-midnight truncate">{s.name}</p>
                    {s.atRisk && <AlertTriangle size={11} className="text-red-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-charcoal/40">Class {s.class}{s.section ? ` · ${s.section}` : ''}</p>
                </div>
              </div>
              {/* Avg score */}
              <div><ScoreBadge score={s.avgScore} /></div>
              {/* Tests passed */}
              <div className="text-sm text-charcoal/70">
                <span className="font-semibold text-midnight">{s.passed}</span>
                <span className="text-charcoal/30"> / {s.totalAttempts}</span>
              </div>
              {/* Engagement */}
              <div className="pr-2"><EngagementBar value={s.engagement} /></div>
              {/* Best */}
              <div><ScoreBadge score={s.bestScore} /></div>
              {/* Last active */}
              <div className="flex items-center gap-1 text-xs text-charcoal/40">
                <Clock size={11} /> {timeAgo(s.lastAttempt)}
              </div>
              {/* Expand */}
              <button onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronDown size={14} className={`text-charcoal/30 transition-transform ${expanded === s.id ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Expanded subject breakdown */}
            {expanded === s.id && (
              <div className="px-5 pb-4 pt-1 border-t border-gray-50">
                {Object.keys(s.bySubject).length === 0 ? (
                  <p className="text-xs text-charcoal/30 py-2">No test attempts yet</p>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-charcoal/40 uppercase tracking-wider mb-2">Subject Breakdown</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(s.bySubject).map(([subj, stat]) => (
                        <div key={subj} className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs font-semibold text-midnight truncate">{subj || 'General'}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <ScoreBadge score={stat.avgScore} />
                            <span className="text-xs text-charcoal/40">{stat.passed}/{stat.attempts} passed</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-charcoal/40 px-1">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> ≥70% Good</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 40–69% Average</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> &lt;40% Needs help</span>
        <span className="flex items-center gap-1"><AlertTriangle size={10} className="text-red-400" /> At Risk: &lt;30% engagement or &lt;40% pass rate</span>
      </div>
    </div>
  )
}
