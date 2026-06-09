'use client'

import { useState, useEffect } from 'react'
import { Brain, RefreshCw, TrendingUp, Users, Award, CheckCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, LineChart, Line, CartesianGrid, Legend, Cell,
} from 'recharts'

interface StageStats {
  stage: string; number: number; passed: number; attempted: number; avgScore: number
}

interface InsightsData {
  insights: string
  stageStats: StageStats[]
  totalEducators: number
}

const COLORS = ['#033D4C', '#225632', '#7D783E', '#FECB08', '#40403E']

export default function AnalyticsPage() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadInsights() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai/insights')
      if (!res.ok) { setError('Failed to load insights'); return }
      setData(await res.json())
    } catch {
      setError('AI service unavailable. Check GROQ_API_KEY.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadInsights() }, [])

  const passRateData = data?.stageStats.map((s) => ({
    name: `S${s.number}`,
    fullName: s.stage,
    passRate: s.attempted > 0 ? Math.round((s.passed / s.attempted) * 100) : 0,
    avgScore: s.avgScore,
    attempted: s.attempted,
    passed: s.passed,
  })) ?? []

  const radialData = data?.stageStats.map((s, i) => ({
    name: `Stage ${s.number}`,
    value: s.attempted > 0 ? Math.round((s.passed / s.attempted) * 100) : 0,
    fill: COLORS[i],
  })) ?? []

  const overallAvg = data?.stageStats.length
    ? Math.round(data.stageStats.reduce((s, x) => s + x.avgScore, 0) / data.stageStats.length)
    : 0

  const totalPassed = data?.stageStats.find((s) => s.number === 5)?.passed ?? 0

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
    if (!active || !payload?.length) return null
    const stat = passRateData.find((d) => d.name === label)
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
        <p className="font-bold text-midnight mb-1">{stat?.fullName}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}{p.name.includes('Rate') || p.name.includes('Score') ? '%' : ''}</strong></p>
        ))}
        <p className="text-charcoal/50 mt-1">{stat?.passed}/{stat?.attempted} educators passed</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-midnight">AI Analytics</h1>
          <p className="text-sm text-charcoal/60">Powered by Llama 3.3 via Groq</p>
        </div>
        <Button onClick={loadInsights} loading={loading} variant="ghost" size="sm">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-10 h-10 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-charcoal/60">Analyzing training data...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 mb-6">{error}</div>
      )}

      {data && !loading && (
        <div className="flex flex-col gap-6">

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-midnight text-white rounded-2xl p-5 text-center">
              <Users size={22} className="text-gold mx-auto mb-2" />
              <div className="text-3xl font-bold">{data.totalEducators}</div>
              <div className="text-xs text-white/60 mt-1">Active Educators</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
              <Award size={22} className="text-gold mx-auto mb-2" />
              <div className="text-3xl font-bold text-midnight">{totalPassed}</div>
              <div className="text-xs text-charcoal/60 mt-1">Fully Certified</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
              <TrendingUp size={22} className="text-forest mx-auto mb-2" />
              <div className="text-3xl font-bold text-midnight">{overallAvg}%</div>
              <div className="text-xs text-charcoal/60 mt-1">Avg Score</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
              <CheckCircle size={22} className="text-forest mx-auto mb-2" />
              <div className="text-3xl font-bold text-midnight">
                {data.stageStats.reduce((s, x) => s + x.attempted, 0)}
              </div>
              <div className="text-xs text-charcoal/60 mt-1">Total Attempts</div>
            </div>
          </div>

          {/* Bar Chart — Pass Rate vs Avg Score */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-midnight mb-1">Pass Rate vs Avg Score by Stage</h2>
            <p className="text-xs text-charcoal/50 mb-5">Percentage comparison across all 5 stages</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={passRateData} barGap={4} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#40403E' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#40403E99' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="passRate" name="Pass Rate" radius={[6, 6, 0, 0]}>
                  {passRateData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Bar>
                <Bar dataKey="avgScore" name="Avg Score" radius={[6, 6, 0, 0]} fill="#FECB08" opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Line Chart — Attempts vs Passed */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-midnight mb-1">Attempts vs Passed per Stage</h2>
            <p className="text-xs text-charcoal/50 mb-5">Shows drop-off between who attempted and who passed</p>
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

          {/* Radial + Stage table row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Radial chart */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-midnight mb-1">Stage Pass Rate</h2>
              <p className="text-xs text-charcoal/50 mb-2">Radial view — outer = Stage 1</p>
              <ResponsiveContainer width="100%" height={220}>
                <RadialBarChart innerRadius="20%" outerRadius="90%" data={radialData} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={6} label={{ position: 'insideStart', fill: '#fff', fontSize: 11, fontWeight: 700 }} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Pass Rate']} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {data.stageStats.map((s, i) => (
                  <div key={s.number} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-charcoal/70">S{s.number} {s.stage}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stage table */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-midnight mb-4">Stage Breakdown</h2>
              <div className="flex flex-col gap-3">
                {data.stageStats.map((s, i) => {
                  const passRate = s.attempted > 0 ? Math.round((s.passed / s.attempted) * 100) : 0
                  return (
                    <div key={s.number}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white" style={{ backgroundColor: COLORS[i] }}>
                            {s.number}
                          </div>
                          <span className="text-xs font-medium text-charcoal">{s.stage}</span>
                        </div>
                        <span className="text-xs font-bold text-midnight">{passRate}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${passRate}%`, backgroundColor: COLORS[i] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-midnight text-white rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={20} className="text-gold" />
              <h2 className="font-bold text-gold">AI Insights</h2>
              <span className="text-xs text-white/40 ml-auto">Llama 3.3 · Groq</span>
            </div>
            <div className="text-white/85 text-sm leading-relaxed whitespace-pre-line">
              {data.insights}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
