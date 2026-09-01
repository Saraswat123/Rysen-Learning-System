'use client'

import { useState, useEffect } from 'react'
import { Trophy, Medal, Award, Lock, CheckCircle2, ChevronDown, ChevronUp, Save, Loader2, Sparkles } from 'lucide-react'

interface EducatorRow {
  userId: string; name: string; email: string; avatarUrl: string | null
  branch: { id: string; name: string } | null
  kra1: number; kra2: number; kra3: number; kra4: number; kra5: number; kra6: number
  testScore: number; average: number; rank: number
  comment: string | null; finalized: boolean; hasRating: boolean
}

const KRA_LABELS = [
  { key: 'kra1', label: 'STEM Kit Completion', short: 'Kit' },
  { key: 'kra2', label: 'Student Test Conduction', short: 'Test' },
  { key: 'kra3', label: 'Software Training & Tech Work', short: 'Tech' },
  { key: 'kra4', label: 'STEM Data Entry (Excel)', short: 'Data' },
  { key: 'kra5', label: 'Event Planning & Coordination', short: 'Events' },
  { key: 'kra6', label: 'Hackathon Preparation', short: 'Hackathon' },
] as const

function currentPeriod() {
  return new Date().toISOString().slice(0, 7)
}

function periodLabel(period: string) {
  return new Date(`${period}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <div className="w-9 h-9 rounded-full bg-gold flex items-center justify-center"><Trophy size={16} className="text-midnight" /></div>
  if (rank === 2) return <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center"><Medal size={16} className="text-white" /></div>
  if (rank === 3) return <div className="w-9 h-9 rounded-full bg-amber-600 flex items-center justify-center"><Medal size={16} className="text-white" /></div>
  return <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-charcoal/50">{rank}</div>
}

export default function AdminRewardsPage() {
  const [period, setPeriod] = useState(currentPeriod())
  const [rows, setRows] = useState<EducatorRow[]>([])
  const [groupExists, setGroupExists] = useState(true)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Partial<EducatorRow>>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [finalizing, setFinalizing] = useState(false)
  const [toast, setToast] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/educator-ratings?period=${period}`)
    const data = await res.json()
    setRows(data.educators ?? [])
    setGroupExists(data.groupExists ?? false)
    setDrafts({})
    setLoading(false)
  }

  useEffect(() => { load() }, [period]) // eslint-disable-line

  function draftValue(row: EducatorRow, key: keyof EducatorRow) {
    return (drafts[row.userId]?.[key] as number | string | undefined) ?? row[key]
  }

  function setDraft(userId: string, key: string, value: number | string) {
    setDrafts((prev) => ({ ...prev, [userId]: { ...prev[userId], [key]: value } }))
  }

  async function saveRow(row: EducatorRow) {
    setSaving(row.userId)
    const d = drafts[row.userId] ?? {}
    await fetch('/api/admin/educator-ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: row.userId, period,
        kra1: d.kra1 ?? row.kra1, kra2: d.kra2 ?? row.kra2, kra3: d.kra3 ?? row.kra3,
        kra4: d.kra4 ?? row.kra4, kra5: d.kra5 ?? row.kra5, kra6: d.kra6 ?? row.kra6,
        comment: (d.comment as string) ?? row.comment,
      }),
    })
    setSaving(null)
    setToast(`Saved ${row.name}'s scores`)
    setTimeout(() => setToast(''), 2500)
    load()
  }

  async function finalizeMonth() {
    if (!confirm(`Finalize ${periodLabel(period)}? This locks scores and notifies all STEM educators of their rank + certificate eligibility.`)) return
    setFinalizing(true)
    await fetch('/api/admin/educator-ratings/finalize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period }),
    })
    setFinalizing(false)
    setToast('Month finalized — educators notified')
    setTimeout(() => setToast(''), 3000)
    load()
  }

  const anyFinalized = rows.some((r) => r.finalized)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-midnight flex items-center gap-2">
            <Trophy size={22} /> Rewards & Achievements
          </h1>
          <p className="text-sm text-charcoal/60 mt-0.5">Monthly STEM educator performance rating — 6 KRA categories + auto-computed test understanding score</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight/20" />
          <button onClick={finalizeMonth} disabled={finalizing || rows.length === 0}
            className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-50 ${anyFinalized ? 'bg-forest/10 text-forest' : 'bg-gold text-midnight hover:bg-gold/90'}`}>
            {anyFinalized ? <CheckCircle2 size={14} /> : <Lock size={14} />}
            {finalizing ? 'Finalizing…' : anyFinalized ? 'Finalized — Re-finalize' : `Finalize ${periodLabel(period)}`}
          </button>
        </div>
      </div>

      {toast && <div className="bg-forest/10 text-forest text-sm font-medium px-4 py-2.5 rounded-xl">{toast}</div>}

      {!groupExists ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-charcoal/40 text-sm">
          No "STEM Educators" group found — create one in Educator Groups first.
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-charcoal/40 text-sm">
          No active members in the STEM Educators group
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const isOpen = expanded === row.userId
            const hasDraft = !!drafts[row.userId]
            return (
              <div key={row.userId} className={`bg-white rounded-2xl border overflow-hidden ${row.rank <= 3 ? 'border-gold/40' : 'border-gray-100'}`}>
                <button onClick={() => setExpanded(isOpen ? null : row.userId)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <RankBadge rank={row.rank} />
                    {row.avatarUrl ? (
                      <img src={row.avatarUrl} className="w-9 h-9 rounded-full object-cover" alt={row.name} />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-midnight/10 flex items-center justify-center text-xs font-bold text-midnight">
                        {row.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-midnight flex items-center gap-2">
                        {row.name}
                        {row.finalized && <span className="text-xs bg-forest/10 text-forest px-2 py-0.5 rounded-full font-bold">Finalized</span>}
                        {hasDraft && <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold">Unsaved</span>}
                      </p>
                      <p className="text-xs text-charcoal/40">{row.branch?.name ?? 'No campus'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-midnight">{row.average}<span className="text-xs text-charcoal/30">/10</span></p>
                      <p className="text-xs text-charcoal/40">average</p>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-charcoal/30" /> : <ChevronDown size={16} className="text-charcoal/30" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-50 px-5 py-4 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-3">
                      {KRA_LABELS.map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                          <span className="text-xs font-medium text-charcoal/70">{label}</span>
                          <input type="number" min={0} max={10}
                            value={draftValue(row, key) as number}
                            onChange={(e) => setDraft(row.userId, key, Math.max(0, Math.min(10, Number(e.target.value))))}
                            className="w-14 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-midnight focus:outline-none focus:ring-2 focus:ring-midnight/20" />
                        </div>
                      ))}
                      <div className="flex items-center justify-between gap-3 bg-midnight/5 rounded-xl px-3 py-2.5">
                        <span className="text-xs font-medium text-charcoal/70 flex items-center gap-1">
                          <Sparkles size={11} className="text-gold" /> Test Understanding (auto)
                        </span>
                        <span className="w-14 text-center text-sm font-bold text-midnight">{row.testScore}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-charcoal/60">Admin Remark</label>
                      <textarea rows={2} value={(draftValue(row, 'comment') as string) ?? ''}
                        onChange={(e) => setDraft(row.userId, 'comment', e.target.value)}
                        placeholder="Optional monthly remark for this educator..."
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-midnight/20" />
                    </div>

                    <button onClick={() => saveRow(row)} disabled={saving === row.userId}
                      className="flex items-center gap-1.5 text-xs font-bold bg-midnight text-white px-4 py-2 rounded-xl hover:bg-midnight/90 transition-colors disabled:opacity-50">
                      {saving === row.userId ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      {saving === row.userId ? 'Saving…' : 'Save Scores'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-midnight/5 rounded-2xl p-5 flex items-start gap-3">
        <Award size={18} className="text-gold flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-midnight">How this works</p>
          <p className="text-xs text-charcoal/50 mt-0.5">
            Score the 6 KRA categories (0–10 each) per STEM educator. "Test Understanding" auto-computes from that
            educator's branch student test scores this month — no manual entry needed. Average across all 7 becomes
            their rank. Finalizing locks the month, notifies every educator with their rank, and unlocks e-certificate
            downloads for the top 3 in their Recognition page.
          </p>
        </div>
      </div>
    </div>
  )
}
