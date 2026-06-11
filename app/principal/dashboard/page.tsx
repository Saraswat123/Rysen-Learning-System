'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Lock, Clock, Trophy } from 'lucide-react'
import Link from 'next/link'

interface Stage {
  id: string; number: number; title: string; subtitle: string
  badgeColor: string; badgeTitle: string | null; isPublished: boolean
  applicableTo: string
  progress: { passed: boolean; attempts: number; bestScore: number | null } | null
}

export default function PrincipalDashboardPage() {
  const router = useRouter()
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/progress').then((r) => r.json()).then((data) => {
      const filtered = (data as Stage[]).filter((s) => s.applicableTo === 'BOTH' || s.applicableTo === 'PRINCIPAL')
      setStages(filtered)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-olive border-t-transparent rounded-full animate-spin" /></div>

  const passed = stages.filter((s) => s.progress?.passed).length
  const total = stages.length

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-midnight">My PD Journey</h1>
        <p className="text-sm text-charcoal/60">Complete your professional development stages</p>
      </div>

      {/* Progress summary */}
      <div className="bg-olive text-white rounded-2xl p-6 mb-8 flex items-center justify-between">
        <div>
          <p className="text-white/70 text-sm mb-1">Overall Progress</p>
          <p className="text-3xl font-bold">{passed}/{total} Stages</p>
          {passed === total && total > 0 && <p className="text-white/80 text-sm mt-1">🏅 All stages complete!</p>}
        </div>
        <div className="flex gap-2">
          {stages.map((s) => (
            <div key={s.id} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${s.progress?.passed ? 'bg-white text-olive' : 'bg-white/20 text-white/60'}`}>
              {s.number}
            </div>
          ))}
        </div>
      </div>

      {/* Campus quick link */}
      <Link href="/principal/campus" className="block bg-white border border-gray-100 rounded-2xl p-4 mb-6 hover:border-olive/30 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-midnight">Campus Educators Progress</p>
            <p className="text-sm text-charcoal/50">View all your educators' training status</p>
          </div>
          <span className="text-olive font-bold">→</span>
        </div>
      </Link>

      {/* Stage cards */}
      <div className="flex flex-col gap-4">
        {stages.map((stage, i) => {
          const prevPassed = i === 0 || stages[i - 1].progress?.passed
          const isLocked = !prevPassed && !stage.progress?.passed
          const isPassed = stage.progress?.passed

          return (
            <div key={stage.id} className={`bg-white rounded-2xl border p-5 ${isLocked ? 'opacity-60 border-gray-100' : isPassed ? 'border-olive/30' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: isPassed ? '#225632' : isLocked ? '#ccc' : stage.badgeColor }}>
                    {isPassed ? <CheckCircle size={18} /> : stage.number}
                  </div>
                  <div>
                    <p className="font-semibold text-midnight">{stage.title}</p>
                    <p className="text-xs text-charcoal/50">{stage.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isPassed && stage.badgeTitle && (
                    <span className="text-xs bg-olive/10 text-olive px-2 py-0.5 rounded-full font-medium">🏅 {stage.badgeTitle}</span>
                  )}
                  {stage.progress?.bestScore != null && !isPassed && (
                    <span className="text-xs text-charcoal/50">Best: {stage.progress.bestScore}%</span>
                  )}
                  {!isLocked ? (
                    <button onClick={() => router.push(`/principal/stage/${stage.id}`)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${isPassed ? 'bg-olive/10 text-olive' : 'bg-olive text-white hover:bg-olive/80'}`}>
                      {isPassed ? 'Review' : 'Start'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-charcoal/30 text-xs">
                      <Lock size={12} /> Locked
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {passed === total && total > 0 && (
        <div className="mt-6 bg-olive/10 border border-olive/30 rounded-2xl p-5 flex items-center gap-4">
          <Trophy size={32} className="text-olive flex-shrink-0" />
          <div>
            <p className="font-bold text-midnight">All Stages Complete!</p>
            <p className="text-sm text-charcoal/60">View your certificate in the educator portal.</p>
          </div>
        </div>
      )}
    </div>
  )
}
