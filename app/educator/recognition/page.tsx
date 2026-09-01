'use client'

import { useState, useEffect } from 'react'
import { Trophy, Medal, Award, Download, Sparkles, Lock } from 'lucide-react'

interface LeaderboardRow {
  rank: number; userId: string; name: string; branch: string | null
  avatarUrl: string | null; average: number; isMe: boolean
}
interface ScoreEntry { criterionId: string; label: string; isAutoTest: boolean; score: number }
interface MyDetail {
  userId: string; name: string; branch: { id: string; name: string } | null
  scores: ScoreEntry[]; average: number; rank: number; comment: string | null
}
interface CategoryInfo { id: string; name: string }
interface RecognitionData {
  isInRecognitionProgram: boolean
  categories?: CategoryInfo[]
  selectedCategoryId?: string
  categoryName?: string
  periods?: string[]
  period?: string | null
  isFinalized?: boolean
  leaderboard?: LeaderboardRow[]
  myDetail?: MyDetail | null
}

function periodLabel(period: string) {
  return new Date(`${period}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <div className="w-9 h-9 rounded-full bg-gold flex items-center justify-center flex-shrink-0"><Trophy size={16} className="text-midnight" /></div>
  if (rank === 2) return <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0"><Medal size={16} className="text-white" /></div>
  if (rank === 3) return <div className="w-9 h-9 rounded-full bg-amber-600 flex items-center justify-center flex-shrink-0"><Medal size={16} className="text-white" /></div>
  return <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-charcoal/50 flex-shrink-0">{rank}</div>
}

export default function RecognitionPage() {
  const [data, setData] = useState<RecognitionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [categoryId, setCategoryId] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (categoryId) params.set('categoryId', categoryId)
    if (selectedPeriod) params.set('period', selectedPeriod)
    fetch(`/api/educator/recognition?${params}`).then((r) => r.json()).then((d) => {
      setData(d)
      if (d.selectedCategoryId) setCategoryId(d.selectedCategoryId)
      setLoading(false)
    })
  }, [categoryId, selectedPeriod]) // eslint-disable-line

  function switchCategory(id: string) {
    setCategoryId(id)
    setSelectedPeriod('')
  }

  async function downloadCertificate() {
    if (!data?.myDetail || !data.period) return
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const m = data.myDetail
    const catName = data.categoryName ?? 'Recognition'

    doc.setFillColor(3, 61, 76)
    doc.rect(0, 0, 297, 210, 'F')
    doc.setFillColor(254, 203, 8)
    doc.rect(10, 10, 277, 3, 'F')
    doc.rect(10, 197, 277, 3, 'F')

    doc.setTextColor(254, 203, 8)
    doc.setFontSize(28)
    doc.setFont('helvetica', 'bold')
    doc.text('RYSEN GROUP OF SCHOOLS', 148, 40, { align: 'center' })
    doc.setFontSize(13)
    doc.setFont('helvetica', 'normal')
    doc.text('Rise To Success', 148, 48, { align: 'center' })

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.text('This certificate is proudly presented to', 148, 68, { align: 'center' })

    doc.setFontSize(30)
    doc.setFont('helvetica', 'bold')
    doc.text(m.name, 148, 85, { align: 'center' })

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(m.branch?.name ?? '', 148, 94, { align: 'center' })

    doc.setFontSize(15)
    doc.text('for being recognised as', 148, 112, { align: 'center' })

    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(254, 203, 8)
    const title = m.rank === 1 ? `${catName.toUpperCase()} — EDUCATOR OF THE MONTH` : m.rank === 2 ? `${catName.toUpperCase()} — RUNNER UP` : `${catName.toUpperCase()} — 3RD PLACE`
    doc.text(title, 148, 128, { align: 'center' })

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'normal')
    doc.text(`${periodLabel(data.period)} · Overall Score: ${m.average}/10 · Rank #${m.rank}`, 148, 142, { align: 'center' })

    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255, 0.7 as unknown as number)
    const critLine = m.scores.map((s) => s.label).join(' · ')
    const wrapped = doc.splitTextToSize(`Awarded across ${critLine}`, 240)
    doc.text(wrapped, 148, 158, { align: 'center' })

    doc.setTextColor(254, 203, 8)
    doc.setFontSize(10)
    doc.text('RYSEN Group of Schools · Run by IITians and Doctors', 148, 185, { align: 'center' })

    doc.save(`RYSEN_${catName.replace(/\s+/g, '_')}_${periodLabel(data.period).replace(' ', '_')}_${m.name.replace(/\s+/g, '_')}.pdf`)
  }

  async function downloadReport() {
    if (!data?.myDetail || !data.period) return
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const m = data.myDetail
    const catName = data.categoryName ?? 'Recognition'

    doc.setFillColor(3, 61, 76)
    doc.rect(0, 0, 210, 30, 'F')
    doc.setTextColor(254, 203, 8)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('RYSEN Group of Schools', 15, 12)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Monthly ${catName} Performance Report — ${periodLabel(data.period!)}`, 15, 20)

    doc.setTextColor(30, 30, 30)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(m.name, 15, 42)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`${m.branch?.name ?? 'No campus'}  ·  Rank #${m.rank}  ·  Overall Average: ${m.average}/10`, 15, 49)

    let y = 65
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Category Breakdown', 15, y)
    y += 8

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    for (const s of m.scores) {
      doc.text(`${s.label}${s.isAutoTest ? ' (auto-computed)' : ''}`, 20, y)
      doc.text(`${s.score}/10`, 170, y)
      y += 8
    }

    y += 4
    doc.setDrawColor(200)
    doc.line(15, y, 195, y)
    y += 10

    if (m.comment) {
      doc.setFont('helvetica', 'bold')
      doc.text('Admin Remark', 15, y)
      y += 7
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(m.comment, 175)
      doc.text(lines, 15, y)
      y += lines.length * 6
    }

    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text('RYSEN Group of Schools · Rise To Success', 15, 285)

    doc.save(`RYSEN_${catName.replace(/\s+/g, '_')}_Report_${periodLabel(data.period!).replace(' ', '_')}_${m.name.replace(/\s+/g, '_')}.pdf`)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!data?.isInRecognitionProgram) return (
    <div className="max-w-xl mx-auto text-center py-24 text-charcoal/40">
      <Award size={48} className="mx-auto mb-4 opacity-20" />
      <p className="text-base font-medium">No recognition programmes yet</p>
      <p className="text-sm mt-1">Contact your admin if you believe you should be part of one</p>
    </div>
  )

  if (!data.period || !data.leaderboard) return (
    <div className="max-w-xl mx-auto space-y-6">
      {data.categories && data.categories.length > 1 && (
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit mx-auto">
          {data.categories.map((c) => (
            <button key={c.id} onClick={() => switchCategory(c.id)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${c.id === (categoryId || data.selectedCategoryId) ? 'bg-white text-midnight shadow-sm' : 'text-charcoal/50'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}
      <div className="text-center py-16 text-charcoal/40">
        <Trophy size={48} className="mx-auto mb-4 opacity-20" />
        <p className="text-base font-medium">No finalized results yet</p>
        <p className="text-sm mt-1">Your admin hasn't finalized a monthly report yet</p>
      </div>
    </div>
  )

  const { myDetail, leaderboard, periods, categories } = data
  const isTop3 = myDetail && myDetail.rank <= 3

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-midnight flex items-center gap-2">
            <Trophy size={22} /> {data.categoryName} Recognition
          </h1>
          <p className="text-sm text-charcoal/60 mt-0.5">Monthly leaderboard, e-certificates & performance reports</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {categories && categories.length > 1 && (
            <select value={categoryId} onChange={(e) => switchCategory(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight/20">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {periods && periods.length > 1 && (
            <select value={selectedPeriod || data.period} onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight/20">
              {periods.map((p) => <option key={p} value={p}>{periodLabel(p)}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* My score card */}
      {myDetail && (
        <div className={`rounded-2xl p-6 text-white ${isTop3 ? 'bg-gradient-to-br from-midnight to-midnight/80' : 'bg-midnight'}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <RankIcon rank={myDetail.rank} />
              <div>
                <p className="text-white/60 text-xs">{periodLabel(data.period)}</p>
                <p className="text-xl font-bold">Rank #{myDetail.rank} · {myDetail.average}/10</p>
                {isTop3 && <p className="text-gold text-sm font-semibold mt-0.5">🏆 {data.categoryName} recognition this month!</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isTop3 && (
                <button onClick={downloadCertificate}
                  className="flex items-center gap-1.5 text-xs font-bold bg-gold text-midnight px-4 py-2 rounded-xl hover:bg-gold/90 transition-colors">
                  <Download size={13} /> Download Certificate
                </button>
              )}
              <button onClick={downloadReport}
                className="flex items-center gap-1.5 text-xs font-bold bg-white/10 text-white px-4 py-2 rounded-xl hover:bg-white/20 transition-colors">
                <Download size={13} /> Download Full Report
              </button>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {myDetail.scores.map((s) => (
              <div key={s.criterionId} className="bg-white/10 rounded-xl p-3">
                <p className="text-xs text-white/50 truncate flex items-center gap-1">
                  {s.isAutoTest && <Sparkles size={10} className="text-gold" />}{s.label}
                </p>
                <p className="text-lg font-bold mt-0.5">{s.score}/10</p>
              </div>
            ))}
          </div>

          {myDetail.comment && (
            <div className="mt-4 bg-white/10 rounded-xl p-3">
              <p className="text-xs text-white/50 mb-1">Admin Remark</p>
              <p className="text-sm text-white/90">{myDetail.comment}</p>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <p className="text-sm font-bold text-midnight">{periodLabel(data.period)} Leaderboard</p>
          <span title="Finalized — locked"><Lock size={13} className="text-charcoal/30" /></span>
        </div>
        <div className="divide-y divide-gray-50">
          {leaderboard.map((row) => (
            <div key={row.userId} className={`px-5 py-3 flex items-center justify-between ${row.isMe ? 'bg-gold/10' : ''}`}>
              <div className="flex items-center gap-3">
                <RankIcon rank={row.rank} />
                {row.avatarUrl ? (
                  <img src={row.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt={row.name} />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-midnight/10 flex items-center justify-center text-xs font-bold text-midnight">
                    {row.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-midnight">{row.name}{row.isMe && <span className="text-xs text-gold font-bold ml-1.5">(You)</span>}</p>
                  <p className="text-xs text-charcoal/40">{row.branch ?? 'No campus'}</p>
                </div>
              </div>
              <p className="text-sm font-bold text-midnight">{row.average}/10</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
