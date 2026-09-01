'use client'

import { useState, useEffect } from 'react'
import { Trophy, Medal, Award, Download, Sparkles, Lock } from 'lucide-react'

interface LeaderboardRow {
  rank: number; userId: string; name: string; branch: string | null
  avatarUrl: string | null; average: number; isMe: boolean
}
interface MyDetail {
  userId: string; name: string; branch: { id: string; name: string } | null
  kra1: number; kra2: number; kra3: number; kra4: number; kra5: number; kra6: number
  testScore: number; average: number; rank: number; comment: string | null
}
interface RecognitionData {
  isStemEducator: boolean
  periods?: string[]
  period?: string
  isFinalized?: boolean
  leaderboard?: LeaderboardRow[]
  myDetail?: MyDetail | null
}

const KRA_LABELS = [
  { key: 'kra1', label: 'STEM Kit Completion' },
  { key: 'kra2', label: 'Student Test Conduction' },
  { key: 'kra3', label: 'Software Training & Tech Work' },
  { key: 'kra4', label: 'STEM Data Entry (Excel)' },
  { key: 'kra5', label: 'Event Planning & Coordination' },
  { key: 'kra6', label: 'Hackathon Preparation' },
] as const

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
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')

  useEffect(() => {
    const url = selectedPeriod ? `/api/educator/recognition?period=${selectedPeriod}` : '/api/educator/recognition'
    fetch(url).then((r) => r.json()).then((d) => { setData(d); setLoading(false) })
  }, [selectedPeriod])

  async function downloadCertificate() {
    if (!data?.myDetail || !data.period) return
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const m = data.myDetail

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
    const title = m.rank === 1 ? 'STEM EDUCATOR OF THE MONTH' : m.rank === 2 ? 'STEM EDUCATOR — RUNNER UP' : 'STEM EDUCATOR — 3RD PLACE'
    doc.text(title, 148, 128, { align: 'center' })

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'normal')
    doc.text(`${periodLabel(data.period)} · Overall Score: ${m.average}/10 · Rank #${m.rank}`, 148, 142, { align: 'center' })

    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255, 0.7 as unknown as number)
    doc.text('Awarded across STEM Kit Completion, Test Conduction, Software Training, Data Entry,', 148, 158, { align: 'center' })
    doc.text('Event Coordination, Hackathon Preparation & Student Test Understanding', 148, 164, { align: 'center' })

    doc.setTextColor(254, 203, 8)
    doc.setFontSize(10)
    doc.text('RYSEN Group of Schools · Run by IITians and Doctors', 148, 185, { align: 'center' })

    doc.save(`RYSEN_STEM_Educator_${periodLabel(data.period).replace(' ', '_')}_${m.name.replace(/\s+/g, '_')}.pdf`)
  }

  async function downloadReport() {
    if (!data?.myDetail || !data.period) return
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const m = data.myDetail

    doc.setFillColor(3, 61, 76)
    doc.rect(0, 0, 210, 30, 'F')
    doc.setTextColor(254, 203, 8)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('RYSEN Group of Schools', 15, 12)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Monthly STEM Performance Report — ${periodLabel(data.period!)}`, 15, 20)

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

    const rowsData = [
      ...KRA_LABELS.map((k) => [k.label, `${m[k.key as keyof MyDetail]}/10`]),
      ['Student Test Understanding (auto-computed)', `${m.testScore}/10`],
    ]
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    for (const [label, score] of rowsData) {
      doc.text(String(label), 20, y)
      doc.text(String(score), 170, y)
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

    doc.save(`RYSEN_STEM_Report_${periodLabel(data.period!).replace(' ', '_')}_${m.name.replace(/\s+/g, '_')}.pdf`)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!data?.isStemEducator) return (
    <div className="max-w-xl mx-auto text-center py-24 text-charcoal/40">
      <Award size={48} className="mx-auto mb-4 opacity-20" />
      <p className="text-base font-medium">Recognition program is for STEM Educators</p>
      <p className="text-sm mt-1">Contact your admin if you believe you should be part of this programme</p>
    </div>
  )

  if (!data.period || !data.leaderboard) return (
    <div className="max-w-xl mx-auto text-center py-24 text-charcoal/40">
      <Trophy size={48} className="mx-auto mb-4 opacity-20" />
      <p className="text-base font-medium">No finalized results yet</p>
      <p className="text-sm mt-1">Your admin hasn't finalized a monthly report yet</p>
    </div>
  )

  const { myDetail, leaderboard, periods } = data
  const isTop3 = myDetail && myDetail.rank <= 3

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-midnight flex items-center gap-2">
            <Trophy size={22} /> STEM Educator Recognition
          </h1>
          <p className="text-sm text-charcoal/60 mt-0.5">Monthly leaderboard, e-certificates & performance reports</p>
        </div>
        {periods && periods.length > 1 && (
          <select value={selectedPeriod || data.period} onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight/20">
            {periods.map((p) => <option key={p} value={p}>{periodLabel(p)}</option>)}
          </select>
        )}
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
                {isTop3 && <p className="text-gold text-sm font-semibold mt-0.5">🏆 STEM Educator of the Month recognition!</p>}
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
            {KRA_LABELS.map(({ key, label }) => (
              <div key={key} className="bg-white/10 rounded-xl p-3">
                <p className="text-xs text-white/50 truncate">{label}</p>
                <p className="text-lg font-bold mt-0.5">{myDetail[key as 'kra1' | 'kra2' | 'kra3' | 'kra4' | 'kra5' | 'kra6']}/10</p>
              </div>
            ))}
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-white/50 flex items-center gap-1"><Sparkles size={10} className="text-gold" /> Test Understanding</p>
              <p className="text-lg font-bold mt-0.5">{myDetail.testScore}/10</p>
            </div>
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
