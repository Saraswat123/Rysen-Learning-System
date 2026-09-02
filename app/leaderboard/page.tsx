'use client'

import { useState, useEffect } from 'react'
import { Trophy, Users, Award, MapPin, ArrowLeft, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Educator { id: string; name: string; stagesPassed: number; completion: number; total: number }
interface BranchStat {
  id: string; name: string; location: string
  total: number; fullyCertified: number; avgCompletion: number
  topEducators: Educator[]
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const router = useRouter()
  const [data, setData] = useState<{ leaderboard: BranchStat[]; totalStages: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/leaderboard')
    const d = await res.json()
    setData(d)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-charcoal/60 hover:text-midnight mb-6">
          <ArrowLeft size={15} /> Back
        </button>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gold rounded-2xl flex items-center justify-center">
              <Trophy size={24} className="text-midnight" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-midnight">School Leaderboard</h1>
              <p className="text-sm text-charcoal/50">Rankings across all RYSEN campuses</p>
            </div>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-charcoal/50 hover:text-midnight">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {data && !loading && (
          <div className="flex flex-col gap-4">
            {/* Top 3 podium */}
            {data.leaderboard.length >= 3 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[1, 0, 2].map((idx) => {
                  const s = data.leaderboard[idx]
                  if (!s) return null
                  const rank = idx + 1
                  const heights = ['h-28', 'h-36', 'h-24']
                  const bgColors = ['bg-silver', 'bg-gold', 'bg-amber-600']
                  return (
                    <div key={s.id} className={`${heights[idx]} rounded-2xl flex flex-col items-center justify-end pb-3 ${idx === 0 ? 'bg-gold/20 border-2 border-gold' : 'bg-white border border-gray-100'}`}>
                      <div className="text-2xl mb-0.5">{MEDALS[rank - 1]}</div>
                      <p className="text-xs font-black text-midnight/70 tracking-wide mb-1">RANK #{rank}</p>
                      <p className="text-xs font-bold text-midnight text-center px-2 leading-tight">{s.name}</p>
                      <p className="text-xs text-charcoal/50">{s.location}</p>
                      <p className="text-sm font-bold text-midnight mt-1">{s.avgCompletion}%</p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Full list */}
            {data.leaderboard.map((branch, i) => (
              <div key={branch.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === branch.id ? null : branch.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-cream/50 transition-colors text-left"
                >
                  {/* Rank */}
                  <div className="flex flex-col items-center flex-shrink-0 w-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-gold text-midnight' : i === 1 ? 'bg-gray-300 text-charcoal' : i === 2 ? 'bg-amber-600 text-white' : 'bg-cream text-charcoal/60'}`}>
                      {i < 3 ? MEDALS[i] : i + 1}
                    </div>
                    <p className="text-[10px] font-black text-charcoal/40 tracking-wide mt-0.5">#{i + 1}</p>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-midnight truncate">{branch.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-bold ${i < 3 ? 'bg-gold/20 text-midnight' : 'bg-gray-100 text-charcoal/50'}`}>Rank #{i + 1}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-charcoal/50">
                      <MapPin size={11} /> {branch.location}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-right flex-shrink-0">
                    <div>
                      <p className="text-lg font-bold text-midnight">{branch.avgCompletion}%</p>
                      <p className="text-xs text-charcoal/40">avg completion</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-forest">{branch.fullyCertified}</p>
                      <p className="text-xs text-charcoal/40">certified</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-charcoal">{branch.total}</p>
                      <p className="text-xs text-charcoal/40">educators</p>
                    </div>
                  </div>
                </button>

                {/* Progress bar */}
                <div className="px-5 pb-3">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-midnight rounded-full transition-all" style={{ width: `${branch.avgCompletion}%` }} />
                  </div>
                </div>

                {/* Expanded top educators */}
                {expanded === branch.id && branch.topEducators.length > 0 && (
                  <div className="border-t border-gray-100 px-5 py-3 bg-cream/30">
                    <p className="text-xs font-semibold text-charcoal/50 mb-2 uppercase tracking-wide">Top Educators</p>
                    <div className="flex flex-col gap-2">
                      {branch.topEducators.map((edu, j) => (
                        <div key={edu.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-charcoal/40 w-8">{MEDALS[j] ?? `#${j + 1}`}</span>
                            <span className="text-charcoal font-medium">{edu.name}</span>
                          </div>
                          <span className="text-xs text-charcoal/50">{edu.stagesPassed}/{edu.total} stages · {edu.completion}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {data.leaderboard.length === 0 && (
              <div className="text-center py-16 text-charcoal/40">
                <Trophy size={40} className="mx-auto mb-3 opacity-20" />
                <p>No data yet — educators need to start their training.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
