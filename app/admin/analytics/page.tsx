'use client'

import { useState, useEffect } from 'react'
import { Brain, RefreshCw, TrendingUp, Users, Award, CheckCircle, GraduationCap, School, ClipboardList, Trophy } from 'lucide-react'
import Button from '@/components/ui/Button'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, LineChart, Line, CartesianGrid, Legend, Cell,
} from 'recharts'

const COLORS = ['#033D4C', '#225632', '#7D783E', '#FECB08', '#40403E', '#5B4D8A', '#9E4A3A']

/* ─── Educator Analytics ─── */
interface StageStats { stage: string; number: number; passed: number; attempted: number; avgScore: number }
interface EducatorData { insights: string; stageStats: StageStats[]; totalEducators: number }

/* ─── Student Analytics ─── */
interface TestStat {
  id: string; title: string; subject: string; targetClass: string
  passScore: number; questions: number; totalAttempts: number
  passed: number; failed: number; passRate: number; avgScore: number
}
interface ClassStat { class: string; attempts: number; passed: number; passRate: number; avgScore: number }
interface StudentScore { id: string; name: string; class: string; section: string; testsTaken: number; passed: number; percentage: number }
interface StudentData {
  insights: string; testStats: TestStat[]; classStats: ClassStat[]
  studentScores: StudentScore[]; totalStudents: number; totalTests: number
  totalAttempts: number; overallPassRate: number; overallAvgScore: number
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-midnight mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}{['Pass Rate', 'Avg Score', 'Pass%', 'Avg%'].includes(p.name) ? '%' : ''}</strong></p>
      ))}
    </div>
  )
}

/* ─── Educator Tab ─── */
function EducatorAnalytics() {
  const [data, setData] = useState<EducatorData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/ai/insights')
      if (!res.ok) { setError('Failed to load'); return }
      setData(await res.json())
    } catch { setError('AI service unavailable.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const passRateData = data?.stageStats.map((s) => ({
    name: `S${s.number}`, fullName: s.stage,
    'Pass Rate': s.attempted > 0 ? Math.round((s.passed / s.attempted) * 100) : 0,
    'Avg Score': s.avgScore, attempted: s.attempted, passed: s.passed,
  })) ?? []

  const overallAvg = data?.stageStats.length
    ? Math.round(data.stageStats.reduce((s, x) => s + x.avgScore, 0) / data.stageStats.length) : 0

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={load} loading={loading} variant="ghost" size="sm"><RefreshCw size={14} /> Refresh</Button>
      </div>
      {loading && <div className="flex flex-col items-center py-16 gap-3"><div className="w-10 h-10 border-4 border-midnight border-t-transparent rounded-full animate-spin" /><p className="text-sm text-charcoal/60">Analyzing educator data…</p></div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 mb-6">{error}</div>}
      {data && !loading && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: Users, color: 'bg-midnight text-white', val: data.totalEducators, label: 'Active Educators', iconCol: 'text-gold' },
              { icon: Award, color: 'bg-white border', val: data.stageStats.find((s) => s.number === 5)?.passed ?? 0, label: 'Fully Certified', iconCol: 'text-gold' },
              { icon: TrendingUp, color: 'bg-white border', val: `${overallAvg}%`, label: 'Avg Score', iconCol: 'text-forest' },
              { icon: CheckCircle, color: 'bg-white border', val: data.stageStats.reduce((s, x) => s + x.attempted, 0), label: 'Total Attempts', iconCol: 'text-forest' },
            ].map((k) => (
              <div key={k.label} className={`rounded-2xl p-5 text-center ${k.color} border-gray-100`}>
                <k.icon size={22} className={`${k.iconCol} mx-auto mb-2`} />
                <div className="text-3xl font-bold">{k.val}</div>
                <div className="text-xs opacity-60 mt-1">{k.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-midnight mb-1">Pass Rate vs Avg Score by Stage</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={passRateData} barGap={4} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#40403E' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#40403E99' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Pass Rate" radius={[6, 6, 0, 0]}>{passRateData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Bar>
                <Bar dataKey="Avg Score" radius={[6, 6, 0, 0]} fill="#FECB08" opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-midnight mb-1">Attempts vs Passed per Stage</h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={passRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#40403E' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#40403E99' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="attempted" name="Attempted" stroke="#033D4C" strokeWidth={2.5} dot={{ r: 5, fill: '#033D4C' }} />
                <Line type="monotone" dataKey="passed" name="Passed" stroke="#225632" strokeWidth={2.5} dot={{ r: 5, fill: '#225632' }} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-midnight mb-2">Stage Pass Rate</h2>
              <ResponsiveContainer width="100%" height={220}>
                <RadialBarChart innerRadius="20%" outerRadius="90%" data={data.stageStats.map((s, i) => ({ name: `S${s.number}`, value: s.attempted > 0 ? Math.round((s.passed / s.attempted) * 100) : 0, fill: COLORS[i] }))} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={6} label={{ position: 'insideStart', fill: '#fff', fontSize: 11, fontWeight: 700 }} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Pass Rate']} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-midnight mb-4">Stage Breakdown</h2>
              <div className="flex flex-col gap-3">
                {data.stageStats.map((s, i) => {
                  const rate = s.attempted > 0 ? Math.round((s.passed / s.attempted) * 100) : 0
                  return (
                    <div key={s.number}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white" style={{ backgroundColor: COLORS[i] }}>{s.number}</div>
                          <span className="text-xs font-medium text-charcoal truncate max-w-36">{s.stage}</span>
                        </div>
                        <span className="text-xs font-bold text-midnight">{rate}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, backgroundColor: COLORS[i] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="bg-midnight text-white rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={20} className="text-gold" />
              <h2 className="font-bold text-gold">AI Insights — Educator Training</h2>
              <span className="text-xs text-white/40 ml-auto">Llama 3.3 · Groq</span>
            </div>
            <div className="text-white/85 text-sm leading-relaxed whitespace-pre-line">{data.insights}</div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Student Analytics Tab ─── */
function StudentAnalytics() {
  const [data, setData] = useState<StudentData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/ai/student-insights')
      if (!res.ok) { setError('Failed to load'); return }
      setData(await res.json())
    } catch { setError('AI service unavailable.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const testChartData = data?.testStats.map((t) => ({
    name: t.title.length > 14 ? t.title.slice(0, 14) + '…' : t.title,
    fullName: t.title,
    'Pass Rate': t.passRate,
    'Avg Score': t.avgScore,
    Attempts: t.totalAttempts,
  })) ?? []

  const classChartData = data?.classStats.map((c) => ({
    name: `Cls ${c.class}`,
    'Pass%': c.passRate,
    'Avg%': c.avgScore,
    Attempts: c.attempts,
  })) ?? []

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={load} loading={loading} variant="ghost" size="sm"><RefreshCw size={14} /> Refresh</Button>
      </div>
      {loading && <div className="flex flex-col items-center py-16 gap-3"><div className="w-10 h-10 border-4 border-midnight border-t-transparent rounded-full animate-spin" /><p className="text-sm text-charcoal/60">Analyzing student responses…</p></div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 mb-6">{error}</div>}
      {data && !loading && (
        <div className="flex flex-col gap-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { icon: School, val: data.totalStudents, label: 'Active Students', bg: 'bg-midnight text-white', ic: 'text-gold' },
              { icon: ClipboardList, val: data.totalTests, label: 'Tests Created', bg: 'bg-white border border-gray-100', ic: 'text-midnight' },
              { icon: Users, val: data.totalAttempts, label: 'Total Attempts', bg: 'bg-white border border-gray-100', ic: 'text-midnight' },
              { icon: CheckCircle, val: `${data.overallPassRate}%`, label: 'Overall Pass Rate', bg: 'bg-forest text-white', ic: 'text-white' },
              { icon: TrendingUp, val: `${data.overallAvgScore}%`, label: 'Avg Score', bg: 'bg-white border border-gray-100', ic: 'text-forest' },
            ].map((k) => (
              <div key={k.label} className={`rounded-2xl p-4 text-center ${k.bg}`}>
                <k.icon size={20} className={`${k.ic} mx-auto mb-1.5`} />
                <div className="text-2xl font-bold">{k.val}</div>
                <div className="text-xs opacity-60 mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Test performance chart */}
          {testChartData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-midnight mb-1">Test Performance Overview</h2>
              <p className="text-xs text-charcoal/50 mb-4">Pass rate and avg score per test</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={testChartData} barGap={4} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#40403E' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#40403E99' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Pass Rate" radius={[6, 6, 0, 0]}>
                    {testChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                  <Bar dataKey="Avg Score" radius={[6, 6, 0, 0]} fill="#FECB08" opacity={0.65} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Class performance + Leaderboard row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Class chart */}
            {classChartData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-bold text-midnight mb-1">Class-wise Performance</h2>
                <p className="text-xs text-charcoal/50 mb-4">Pass rate and avg score by class</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={classChartData} barGap={3} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#40403E' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#40403E99' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Pass%" radius={[5, 5, 0, 0]}>
                      {classChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                    <Bar dataKey="Avg%" radius={[5, 5, 0, 0]} fill="#FECB08" opacity={0.65} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top students leaderboard */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-midnight mb-4 flex items-center gap-2">
                <Trophy size={16} className="text-gold" /> Top Students
              </h2>
              <div className="flex flex-col gap-2">
                {data.studentScores.slice(0, 8).map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: i < 3 ? COLORS[i] : '#f3f4f6', color: i < 3 ? '#fff' : '#40403E' }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-midnight truncate">{s.name}</p>
                      <p className="text-xs text-charcoal/50">Class {s.class}{s.section ? `-${s.section}` : ''} · {s.passed}/{s.testsTaken} passed</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-midnight">{s.percentage}%</p>
                    </div>
                  </div>
                ))}
                {data.studentScores.length === 0 && (
                  <p className="text-sm text-charcoal/40 text-center py-4">No attempts yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Test detail table */}
          {data.testStats.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-midnight">Test-wise Breakdown</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-charcoal/60 font-semibold">Test</th>
                    <th className="text-left px-5 py-3 text-charcoal/60 font-semibold hidden sm:table-cell">Subject</th>
                    <th className="text-left px-5 py-3 text-charcoal/60 font-semibold hidden md:table-cell">Class</th>
                    <th className="text-center px-5 py-3 text-charcoal/60 font-semibold">Attempts</th>
                    <th className="text-center px-5 py-3 text-charcoal/60 font-semibold">Pass Rate</th>
                    <th className="text-center px-5 py-3 text-charcoal/60 font-semibold">Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.testStats.map((t) => (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-midnight">{t.title}</td>
                      <td className="px-5 py-3 text-charcoal/60 hidden sm:table-cell">{t.subject || '—'}</td>
                      <td className="px-5 py-3 text-charcoal/60 hidden md:table-cell">{t.targetClass ? `Class ${t.targetClass}` : 'All'}</td>
                      <td className="px-5 py-3 text-center text-charcoal/70">{t.totalAttempts}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.passRate >= 70 ? 'bg-forest/10 text-forest' : t.passRate >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                          {t.passRate}%
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center font-semibold text-midnight">{t.avgScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* AI Insights */}
          <div className="bg-midnight text-white rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={20} className="text-gold" />
              <h2 className="font-bold text-gold">AI Insights — Student Performance</h2>
              <span className="text-xs text-white/40 ml-auto">Llama 3.3 · Groq</span>
            </div>
            <div className="text-white/85 text-sm leading-relaxed whitespace-pre-line">{data.insights}</div>
          </div>
        </div>
      )}

      {data?.totalAttempts === 0 && !loading && (
        <div className="text-center py-16 text-charcoal/40">
          <Brain size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No student attempts yet. Insights will appear once students complete tests.</p>
        </div>
      )}
    </div>
  )
}

/* ─── Main Page ─── */
export default function AnalyticsPage() {
  const [tab, setTab] = useState<'educator' | 'student'>('educator')

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-midnight">AI Analytics</h1>
          <p className="text-sm text-charcoal/60">Powered by Llama 3.3 via Groq</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-8 w-fit">
        <button
          onClick={() => setTab('educator')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'educator' ? 'bg-midnight text-white shadow-sm' : 'text-charcoal/60 hover:text-midnight'}`}>
          <GraduationCap size={16} /> Educator Training
        </button>
        <button
          onClick={() => setTab('student')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'student' ? 'bg-midnight text-white shadow-sm' : 'text-charcoal/60 hover:text-midnight'}`}>
          <School size={16} /> Student Tests
        </button>
      </div>

      {tab === 'educator' ? <EducatorAnalytics /> : <StudentAnalytics />}
    </div>
  )
}
