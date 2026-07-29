'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingDown, AlertTriangle, Users, Activity, BookOpen, Target, Flame } from 'lucide-react'

interface Band { label: string; count: number }
interface SubjectStat {
  subject: string; attempts: number; passed: number; passRate: number
  avgScore: number; uniqueStudents: number; bands: Band[]
}
interface StageRow { stageId: string; number: number; title: string; attempted: number; passed: number; dropRate: number }
interface FunnelProgram { programId: string; programName: string; enrolled: number; stages: StageRow[] }
interface WeekBucket { label: string; count: number; uniqueStudents: number }
interface AtRiskStudent {
  id: string; name: string; class: string
  lastAttempt: string | null; passRate: number; totalAttempts: number; reason: string
}
interface Analytics {
  subjectStats: SubjectStat[]
  stageFunnel: FunnelProgram[]
  engagementTrend: WeekBucket[]
  atRisk: AtRiskStudent[]
  meta: { totalStudents: number; totalAttempts: number; totalSubjects: number; scoreBands: string[] }
}

const BAND_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e']
const MIDNIGHT = '#033D4C'
const FOREST = '#225632'
const GOLD = '#FECB08'

function timeAgo(iso: string | null) {
  if (!iso) return 'Never'
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

// Heat cell: blue-to-red gradient intensity by count
function HeatCell({ count, max }: { count: number; max: number }) {
  const intensity = max > 0 ? count / max : 0
  const alpha = 0.08 + intensity * 0.85
  const r = Math.round(3 + intensity * 230)
  const g = Math.round(61 + intensity * (intensity > 0.5 ? -30 : 80))
  const b = Math.round(76 + intensity * -70)
  const bg = count === 0 ? '#f9fafb' : `rgba(${r},${g},${b},${alpha})`
  return (
    <div
      className="rounded-lg flex items-center justify-center text-xs font-bold transition-colors"
      style={{ backgroundColor: bg, color: intensity > 0.5 ? '#fff' : '#374151', minHeight: 36 }}
    >
      {count > 0 ? count : '—'}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'subjects' | 'heatmap' | 'funnel' | 'atrisk'>('subjects')

  useEffect(() => {
    fetch('/api/educator/analytics').then(r => r.json()).then(d => {
      if (d.subjectStats) setData(d)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!data || data.meta.totalAttempts === 0) return (
    <div className="flex flex-col items-center justify-center py-24 text-charcoal/30">
      <BarChart3 size={48} className="mb-4 opacity-20" />
      <p className="text-base font-medium">No test data yet</p>
      <p className="text-sm mt-1">Analytics populate once students attempt tests</p>
    </div>
  )

  const { subjectStats, stageFunnel, engagementTrend, atRisk, meta } = data
  const maxAvgScore = Math.max(...subjectStats.map(s => s.avgScore), 1)
  const maxAttempts = Math.max(...subjectStats.map(s => s.attempts), 1)
  const maxWeekCount = Math.max(...engagementTrend.map(w => w.count), 1)

  // Heatmap max count across all cells
  const allCounts = subjectStats.flatMap(s => s.bands.map(b => b.count))
  const heatMax = Math.max(...allCounts, 1)

  const hardestSubject = [...subjectStats].sort((a, b) => a.avgScore - b.avgScore)[0]
  const easiestSubject = [...subjectStats].sort((a, b) => b.avgScore - a.avgScore)[0]

  const tabs = [
    { key: 'subjects', label: 'Subject Performance', icon: BarChart3 },
    { key: 'heatmap', label: 'Score Heatmap', icon: Flame },
    { key: 'funnel', label: 'Stage Dropout', icon: TrendingDown },
    { key: 'atrisk', label: `At Risk (${atRisk.length})`, icon: AlertTriangle },
  ] as const

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-midnight flex items-center gap-2">
          <BarChart3 size={22} /> Class Analytics
        </h1>
        <p className="text-sm text-charcoal/60 mt-0.5">Subject difficulty, score distribution, stage dropout and at-risk detection</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Students', value: meta.totalStudents, icon: Users, color: MIDNIGHT },
          { label: 'Total Attempts', value: meta.totalAttempts, icon: Activity, color: FOREST },
          { label: 'Subjects', value: meta.totalSubjects, icon: BookOpen, color: '#7D783E' },
          { label: 'At Risk', value: atRisk.length, icon: AlertTriangle, color: '#ef4444' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
              <Icon size={16} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-charcoal/40 font-medium">{label}</p>
              <p className="text-xl font-bold text-midnight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Insight chips */}
      {hardestSubject && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs bg-red-50 text-red-600 font-semibold px-3 py-1.5 rounded-full border border-red-100">
            <TrendingDown size={11} /> Hardest: {hardestSubject.subject} ({hardestSubject.avgScore}% avg)
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs bg-green-50 text-green-700 font-semibold px-3 py-1.5 rounded-full border border-green-100">
            <Target size={11} /> Easiest: {easiestSubject.subject} ({easiestSubject.avgScore}% avg)
          </span>
          {atRisk.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 font-semibold px-3 py-1.5 rounded-full border border-amber-100">
              <AlertTriangle size={11} /> {atRisk.length} student{atRisk.length !== 1 ? 's' : ''} need attention
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${tab === key ? 'bg-white text-midnight shadow-sm' : 'text-charcoal/50 hover:text-midnight'}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ── Subject Performance ── */}
      {tab === 'subjects' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-bold text-midnight">Average score & pass rate by subject</p>
          </div>
          <div className="divide-y divide-gray-50">
            {subjectStats.map((s) => (
              <div key={s.subject} className="px-5 py-4 grid grid-cols-[1fr_80px_80px_80px] gap-4 items-center">
                <div>
                  <p className="text-sm font-semibold text-midnight">{s.subject}</p>
                  <p className="text-xs text-charcoal/40 mt-0.5">{s.attempts} attempts · {s.uniqueStudents} students</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-charcoal/30 w-16">Avg score</span>
                      <div className="flex-1"><ScoreBar value={s.avgScore} max={100} color={MIDNIGHT} /></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-charcoal/30 w-16">Pass rate</span>
                      <div className="flex-1"><ScoreBar value={s.passRate} max={100} color={s.passRate >= 60 ? FOREST : s.passRate >= 40 ? GOLD : '#ef4444'} /></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-charcoal/30 w-16">Volume</span>
                      <div className="flex-1"><ScoreBar value={s.attempts} max={maxAttempts} color="#94a3b8" /></div>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold" style={{ color: s.avgScore >= 70 ? FOREST : s.avgScore >= 40 ? '#d97706' : '#ef4444' }}>
                    {s.avgScore}%
                  </p>
                  <p className="text-xs text-charcoal/30">avg</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold" style={{ color: s.passRate >= 60 ? FOREST : s.passRate >= 40 ? '#d97706' : '#ef4444' }}>
                    {s.passRate}%
                  </p>
                  <p className="text-xs text-charcoal/30">pass</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-midnight">{s.passed}</p>
                  <p className="text-xs text-charcoal/30">passed</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Score Heatmap ── */}
      {tab === 'heatmap' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-bold text-midnight">Score distribution heatmap — where students cluster</p>
            <p className="text-xs text-charcoal/40 mt-0.5">Darker cell = more students scored in that band. Red bands = struggling zone.</p>
          </div>
          <div className="p-5 overflow-x-auto">
            {/* Header row */}
            <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `180px repeat(${meta.scoreBands.length}, 1fr)` }}>
              <div />
              {meta.scoreBands.map((b, i) => (
                <div key={b} className="text-center text-xs font-bold px-1 py-1 rounded-lg" style={{ backgroundColor: BAND_COLORS[i] + '22', color: BAND_COLORS[i] }}>
                  {b}
                </div>
              ))}
            </div>
            {/* Subject rows */}
            {subjectStats.map((s) => (
              <div key={s.subject} className="grid gap-2 mb-2 items-center" style={{ gridTemplateColumns: `180px repeat(${meta.scoreBands.length}, 1fr)` }}>
                <div className="text-xs font-semibold text-midnight truncate pr-2" title={s.subject}>{s.subject}</div>
                {s.bands.map((b) => (
                  <HeatCell key={b.label} count={b.count} max={heatMax} />
                ))}
              </div>
            ))}
            {/* Legend */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-50">
              <span className="text-xs text-charcoal/40">Intensity:</span>
              <div className="flex items-center gap-1">
                {[0.08, 0.3, 0.55, 0.8, 1].map((a, i) => (
                  <div key={i} className="w-5 h-4 rounded" style={{ backgroundColor: `rgba(3,61,76,${a})` }} />
                ))}
              </div>
              <span className="text-xs text-charcoal/40">Few → Many students</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Stage Dropout Funnel ── */}
      {tab === 'funnel' && (
        <div className="space-y-4">
          {stageFunnel.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-charcoal/30 text-sm">
              No program enrollments yet
            </div>
          ) : stageFunnel.map((prog) => (
            <div key={prog.programId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-midnight">{prog.programName}</p>
                  <p className="text-xs text-charcoal/40">{prog.enrolled} educators enrolled</p>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {prog.stages.map((stage, idx) => {
                  const completionPct = prog.enrolled > 0 ? Math.round((stage.passed / prog.enrolled) * 100) : 0
                  const attemptedPct = prog.enrolled > 0 ? Math.round((stage.attempted / prog.enrolled) * 100) : 0
                  const isDropPoint = idx > 0 && stage.attempted < (prog.stages[idx - 1]?.attempted ?? stage.attempted) * 0.7
                  return (
                    <div key={stage.stageId}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-gray-100 text-xs font-bold flex items-center justify-center text-charcoal/50">{stage.number}</span>
                          <span className="text-sm font-medium text-midnight">{stage.title}</span>
                          {isDropPoint && (
                            <span className="text-xs bg-red-50 text-red-500 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <TrendingDown size={10} /> Big drop
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-charcoal/40">
                          <span>{stage.attempted} attempted</span>
                          <span className="font-bold text-forest">{stage.passed} passed</span>
                        </div>
                      </div>
                      {/* Funnel bars: attempted (bg) + passed (fg) */}
                      <div className="relative h-5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-midnight/20 rounded-full transition-all"
                          style={{ width: `${attemptedPct}%` }} />
                        <div className="absolute inset-y-0 left-0 rounded-full transition-all"
                          style={{ width: `${completionPct}%`, backgroundColor: FOREST }} />
                        <div className="absolute inset-0 flex items-center px-3">
                          <span className="text-xs font-bold text-white mix-blend-difference">{completionPct}% passed</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── At Risk ── */}
      {tab === 'atrisk' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-bold text-midnight">Students needing intervention</p>
            <p className="text-xs text-charcoal/40 mt-0.5">Inactive 14+ days or pass rate below 40%</p>
          </div>
          {atRisk.length === 0 ? (
            <div className="py-12 text-center text-charcoal/30 text-sm">No at-risk students — great work!</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {atRisk.map((s) => (
                <div key={s.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-sm font-bold text-red-500">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-midnight">{s.name}</p>
                      <p className="text-xs text-charcoal/40">Class {s.class} · {s.totalAttempts} attempts</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold" style={{ color: s.passRate >= 40 ? '#d97706' : '#ef4444' }}>{s.passRate}%</p>
                    <p className="text-xs text-charcoal/30">pass rate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-charcoal/60">{timeAgo(s.lastAttempt)}</p>
                    <p className="text-xs text-charcoal/30">last active</p>
                  </div>
                  <span className="text-xs bg-red-50 text-red-500 font-semibold px-3 py-1 rounded-full border border-red-100 flex-shrink-0">
                    {s.reason}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Engagement trend */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-sm font-bold text-midnight mb-4 flex items-center gap-2"><Activity size={15} /> Weekly Engagement Trend (last 5 weeks)</p>
        <div className="flex items-end gap-3 h-24">
          {engagementTrend.map((w) => {
            const pct = maxWeekCount > 0 ? (w.count / maxWeekCount) * 100 : 0
            return (
              <div key={w.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-midnight">{w.count}</span>
                <div className="w-full rounded-t-lg transition-all duration-500 relative group"
                  style={{ height: `${Math.max(pct, 4)}%`, backgroundColor: MIDNIGHT, minHeight: 4 }}>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-midnight text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {w.uniqueStudents} students
                  </div>
                </div>
                <span className="text-xs text-charcoal/30 text-center leading-tight">{w.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
