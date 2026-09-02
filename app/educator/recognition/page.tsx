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

function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

// TTF for jsPDF custom font embedding — returns null on failure so the caller
// can fall back to a built-in font rather than break the download.
async function fetchFontBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return arrayBufferToBase64(await res.arrayBuffer())
  } catch { return null }
}

async function fetchImageBase64(path: string): Promise<{ data: string; aspect: number } | null> {
  try {
    const res = await fetch(path)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const data = `data:image/png;base64,${arrayBufferToBase64(buf)}`
    const aspect = await new Promise<number>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img.naturalWidth / img.naturalHeight || 1)
      img.onerror = reject
      img.src = data
    })
    return { data, aspect }
  } catch { return null }
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
    setLoading(true)
    const params = new URLSearchParams()
    if (categoryId) params.set('categoryId', categoryId)
    if (selectedPeriod) params.set('period', selectedPeriod)
    fetch(`/api/educator/recognition?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        if (d.selectedCategoryId) setCategoryId(d.selectedCategoryId)
      })
      .catch(() => setData({ isInRecognitionProgram: false }))
      .finally(() => setLoading(false))
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
    const W = 297, H = 210, CX = W / 2

    // Embed a calligraphy script face for the name and an elegant serif for headings —
    // jsPDF ships only Helvetica/Times/Courier, so real certificate typography has to be
    // fetched and registered at render time.
    const [scriptFont, serifFont, logoData] = await Promise.all([
      fetchFontBase64('https://raw.githubusercontent.com/google/fonts/main/ofl/greatvibes/GreatVibes-Regular.ttf'),
      fetchFontBase64('https://raw.githubusercontent.com/google/fonts/main/ofl/marcellus/Marcellus-Regular.ttf'),
      fetchImageBase64('/rysen-logo.png'),
    ])
    if (scriptFont) {
      doc.addFileToVFS('GreatVibes-Regular.ttf', scriptFont)
      doc.addFont('GreatVibes-Regular.ttf', 'GreatVibes', 'normal')
    }
    if (serifFont) {
      doc.addFileToVFS('Marcellus-Regular.ttf', serifFont)
      doc.addFont('Marcellus-Regular.ttf', 'Marcellus', 'normal')
    }
    const heading = serifFont ? 'Marcellus' : 'times'
    const script = scriptFont ? 'GreatVibes' : 'times'

    // Deep ivory-on-midnight ground, no faded/alpha text — every color below is a solid tone.
    const midnight: [number, number, number] = [8, 32, 41]
    const midnightDeep: [number, number, number] = [4, 20, 27]
    const gold: [number, number, number] = [212, 168, 60]
    const goldBright: [number, number, number] = [244, 200, 96]
    const ivory: [number, number, number] = [237, 228, 205]
    const ivoryMuted: [number, number, number] = [176, 168, 143]

    // Ground + vignette-style corner panels for depth (flat fill vs. gradient jsPDF can't do)
    doc.setFillColor(...midnight)
    doc.rect(0, 0, W, H, 'F')
    doc.setFillColor(...midnightDeep)
    doc.triangle(0, 0, 70, 0, 0, 55, 'F')
    doc.triangle(W, H, W - 70, H, W, H - 55, 'F')

    // Ornamental double border
    doc.setDrawColor(...gold)
    doc.setLineWidth(0.9)
    doc.rect(7, 7, W - 14, H - 14)
    doc.setLineWidth(0.3)
    doc.rect(10.5, 10.5, W - 21, H - 21)
    // Corner flourish ticks
    const corners: [number, number, number, number][] = [
      [7, 7, 1, 1], [W - 7, 7, -1, 1], [7, H - 7, 1, -1], [W - 7, H - 7, -1, -1],
    ]
    doc.setLineWidth(0.9)
    corners.forEach(([x, y, dx, dy]) => {
      doc.line(x, y, x + dx * 12, y)
      doc.line(x, y, x, y + dy * 12)
    })

    // Logo, centered top — small white card behind it since the source PNG has a
    // white (non-transparent) background, same treatment RysenLogo.tsx uses on dark grounds
    if (logoData) {
      const logoH = 15
      const logoW = logoH * logoData.aspect
      const pad = 2
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(CX - logoW / 2 - pad, 10 - pad, logoW + pad * 2, logoH + pad * 2, 1.5, 1.5, 'F')
      try {
        doc.addImage(logoData.data, 'PNG', CX - logoW / 2, 10, logoW, logoH)
      } catch { /* image decode failed — proceed without it */ }
    }

    doc.setTextColor(...gold)
    doc.setFont(heading, 'normal')
    doc.setFontSize(20)
    doc.text('RYSEN GROUP OF SCHOOLS', CX, 38, { align: 'center', charSpace: 0.6 })
    doc.setFontSize(9)
    doc.setTextColor(...ivoryMuted)
    doc.text('R Y S E N   L E A R N I N G   C E N T R E   ·   R I S E   T O   S U C C E S S', CX, 44, { align: 'center' })

    // Small rule under the masthead
    doc.setDrawColor(...gold)
    doc.setLineWidth(0.25)
    doc.line(CX - 30, 48, CX + 30, 48)

    doc.setTextColor(...ivory)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11.5)
    doc.text('This certificate is proudly presented to', CX, 60, { align: 'center' })

    // Recipient name in the calligraphy face — the centerpiece
    doc.setTextColor(...goldBright)
    doc.setFont(script, 'normal')
    doc.setFontSize(40)
    doc.text(m.name, CX, 80, { align: 'center' })
    doc.setDrawColor(...gold)
    doc.setLineWidth(0.25)
    doc.line(CX - 45, 84, CX + 45, 84)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(...ivoryMuted)
    doc.text(m.branch?.name ?? '', CX, 91, { align: 'center' })

    doc.setFontSize(12)
    doc.setTextColor(...ivory)
    doc.text('in recognition of outstanding performance as', CX, 104, { align: 'center' })

    const title = m.rank === 1 ? `${catName.toUpperCase()} — EDUCATOR OF THE MONTH` : m.rank === 2 ? `${catName.toUpperCase()} — RUNNER UP` : `${catName.toUpperCase()} — 3RD PLACE`
    doc.setFont(heading, 'normal')
    doc.setFontSize(18)
    doc.setTextColor(...goldBright)
    doc.text(title, CX, 118, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(...ivory)
    doc.text(`${periodLabel(data.period)}  ·  Overall Score ${m.average}/10  ·  Rank #${m.rank}`, CX, 132, { align: 'center' })

    doc.setFontSize(8.5)
    doc.setTextColor(...ivoryMuted)
    const critLine = m.scores.map((s) => s.label).join('  ·  ')
    const wrapped = doc.splitTextToSize(`Awarded across  ${critLine}`, 210)
    doc.text(wrapped, CX, 144, { align: 'center' })

    // Decorative seal, bottom right — concentric rings + star, standing in for a signature/stamp
    const sealX = W - 46, sealY = H - 38
    doc.setFillColor(...gold)
    doc.circle(sealX, sealY, 12, 'F')
    doc.setFillColor(...midnight)
    doc.circle(sealX, sealY, 9.3, 'F')
    doc.setDrawColor(...gold)
    doc.setLineWidth(0.4)
    doc.circle(sealX, sealY, 10.6)
    doc.setFont(heading, 'normal')
    doc.setFontSize(13)
    doc.setTextColor(...goldBright)
    doc.text('R', sealX, sealY, { align: 'center' })
    doc.setFontSize(4.2)
    doc.setFont('helvetica', 'normal')
    doc.text('EST. RYSEN', sealX, sealY + 6.2, { align: 'center' })

    // Signature line, bottom left
    doc.setDrawColor(...ivoryMuted)
    doc.setLineWidth(0.25)
    doc.line(30, H - 34, 90, H - 34)
    doc.setFontSize(8.5)
    doc.setTextColor(...ivoryMuted)
    doc.text('Programme Director, RYSEN Group of Schools', 60, H - 29, { align: 'center' })

    doc.setFont(heading, 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...gold)
    doc.text('Run by IITians and Doctors', CX, H - 16, { align: 'center' })

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
