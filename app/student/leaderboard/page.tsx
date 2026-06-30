'use client'

import { useState, useEffect } from 'react'
import { Trophy, Medal, Award } from 'lucide-react'

interface LeaderEntry {
  rank: number
  student: { id: string; name: string; class: string; section: string; branch?: { name: string } | null }
  totalScore: number
  totalMarks: number
  percentage: number
  passed: number
  tests: number
}

const RANK_COLORS = ['#FECB08', '#C0C0C0', '#CD7F32']
const RANK_ICONS = [Trophy, Medal, Award]

export default function StudentLeaderboard() {
  const [entries, setEntries] = useState<LeaderEntry[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterClass, setFilterClass] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/student-leaderboard').then((r) => r.json()),
      fetch('/api/auth/student-me').then((r) => r.json()),
    ]).then(([lb, me]) => {
      setEntries(Array.isArray(lb) ? lb : [])
      setMyId(me.student?.id ?? null)
      setLoading(false)
    })
  }, [])

  const classes = [...new Set(entries.map((e) => e.student.class))].sort()
  const filtered = filterClass ? entries.filter((e) => e.student.class === filterClass).map((e, i) => ({ ...e, rank: i + 1 })) : entries

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-midnight flex items-center gap-2">
            <Trophy size={24} className="text-gold" /> Leaderboard
          </h1>
          <p className="text-sm text-charcoal/60 mt-0.5">{filtered.length} students ranked</p>
        </div>
        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight">
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c} value={c}>Class {c}</option>)}
        </select>
      </div>

      {/* Top 3 Podium */}
      {filtered.length >= 3 && (
        <div className="flex items-end justify-center gap-3 mb-8">
          {[filtered[1], filtered[0], filtered[2]].map((entry, podiumIdx) => {
            const heights = ['h-28', 'h-36', 'h-20']
            const actualRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3
            const RankIcon = RANK_ICONS[actualRank - 1]
            return (
              <div key={entry.student.id} className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-full bg-midnight flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {entry.student.name.charAt(0).toUpperCase()}
                </div>
                <p className="text-xs font-semibold text-midnight text-center leading-tight max-w-20 truncate">{entry.student.name}</p>
                <p className="text-xs text-charcoal/50">Class {entry.student.class}</p>
                <div className={`${heights[podiumIdx]} w-20 rounded-t-xl flex flex-col items-center justify-end pb-3 gap-1`}
                  style={{ backgroundColor: RANK_COLORS[actualRank - 1] + '30', border: `2px solid ${RANK_COLORS[actualRank - 1]}` }}>
                  <RankIcon size={18} style={{ color: RANK_COLORS[actualRank - 1] }} />
                  <p className="text-sm font-bold text-midnight">{entry.percentage}%</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Full Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filtered.map((entry) => {
          const isMe = entry.student.id === myId
          const RankIcon = entry.rank <= 3 ? RANK_ICONS[entry.rank - 1] : null
          return (
            <div key={entry.student.id}
              className={`flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 ${isMe ? 'bg-gold/10' : 'hover:bg-gray-50/50'}`}>
              <div className="w-8 text-center flex-shrink-0">
                {RankIcon
                  ? <RankIcon size={18} style={{ color: RANK_COLORS[entry.rank - 1] }} className="mx-auto" />
                  : <span className="text-sm font-bold text-charcoal/40">#{entry.rank}</span>}
              </div>
              <div className="w-9 h-9 rounded-full bg-midnight flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {entry.student.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-midnight text-sm flex items-center gap-2">
                  {entry.student.name}
                  {isMe && <span className="text-xs bg-gold text-midnight px-2 py-0.5 rounded-full font-bold">You</span>}
                </p>
                <p className="text-xs text-charcoal/50">
                  Class {entry.student.class}{entry.student.section ? ` - ${entry.student.section}` : ''}
                  {entry.student.branch?.name && ` · ${entry.student.branch.name}`}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-midnight">{entry.percentage}%</p>
                <p className="text-xs text-charcoal/50">{entry.totalScore}/{entry.totalMarks} marks</p>
                <p className="text-xs text-charcoal/40">{entry.passed}/{entry.tests} passed</p>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-charcoal/40">
            <Trophy size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No results yet. Be the first!</p>
          </div>
        )}
      </div>
    </div>
  )
}
