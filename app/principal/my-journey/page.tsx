'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, CheckCircle, ChevronRight, BookOpen, Award, Trophy } from 'lucide-react'
import Link from 'next/link'

interface Stage {
  id: string; number: number; title: string; subtitle: string
  week: string; badgeColor: string; badgeTitle: string | null
  isPublished: boolean; applicableTo: string
  _count: { questions: number }
  progress: { passed: boolean; bestScore: number | null; attempts: number; docRead: boolean } | null
}

const STRIPE_COLORS = ['#033D4C', '#225632', '#7D783E', '#FECB08', '#033D4C']
const STRIPE_TEXT = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#033D4C', '#FFFFFF']

export default function PrincipalMyJourneyPage() {
  const router = useRouter()
  const [stages, setStages] = useState<Stage[]>([])
  const [user, setUser] = useState<{ name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/progress').then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.json()),
    ]).then(([s, m]) => {
      const filtered = (s as Stage[]).filter(
        (st) => st.applicableTo === 'BOTH' || st.applicableTo === 'PRINCIPAL'
      )
      setStages(filtered)
      setUser(m.user)
    }).finally(() => setLoading(false))
  }, [])

  const passedCount = stages.filter((s) => s.progress?.passed).length
  const total = stages.length
  const allDone = total > 0 && passedCount === total

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-olive border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-midnight">My PD Journey</h1>
        <p className="text-charcoal/60 text-sm mt-1">
          Welcome, {user?.name?.split(' ')[0]} — your professional development stages
        </p>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-midnight">Overall Progress</span>
          <span className="text-sm font-bold text-midnight">{passedCount}/{total} stages</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-olive rounded-full transition-all duration-500"
            style={{ width: total > 0 ? `${(passedCount / total) * 100}%` : '0%' }}
          />
        </div>
        {allDone && (
          <div className="mt-3 flex items-center gap-2 text-sm text-olive font-medium">
            <CheckCircle size={16} />
            All stages complete!
          </div>
        )}
      </div>

      {/* Stage cards */}
      <div className="flex flex-col gap-4">
        {stages.map((stage, i) => {
          const passed = stage.progress?.passed ?? false
          const attempted = (stage.progress?.attempts ?? 0) > 0
          const prevPassed = i === 0 || stages[i - 1].progress?.passed
          const locked = !prevPassed && !passed || !stage.isPublished

          const colorIdx = Math.min(i, STRIPE_COLORS.length - 1)

          return (
            <div
              key={stage.id}
              className={`bg-white rounded-2xl border overflow-hidden transition-all ${locked ? 'border-gray-100 opacity-60' : passed ? 'border-olive/30' : 'border-gold/30 shadow-sm'}`}
            >
              <div className="flex items-stretch">
                <div className="w-1.5" style={{ backgroundColor: STRIPE_COLORS[colorIdx] }} />

                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                        style={{ backgroundColor: STRIPE_COLORS[colorIdx], color: STRIPE_TEXT[colorIdx] }}
                      >
                        {passed ? <CheckCircle size={22} /> : stage.number}
                      </div>
                      <div>
                        <h3 className="font-bold text-midnight">{stage.title}</h3>
                        <p className="text-sm text-charcoal/60">{stage.subtitle}</p>
                        {stage.week && <p className="text-xs text-charcoal/40 mt-0.5">{stage.week}</p>}
                      </div>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-2">
                      {passed && (
                        <span className="flex items-center gap-1 text-xs bg-olive/10 text-olive px-2.5 py-1 rounded-full font-medium">
                          <Award size={12} /> Passed {stage.progress?.bestScore}%
                        </span>
                      )}
                      {locked ? (
                        <div className="flex items-center gap-1 text-xs text-charcoal/40 px-3 py-1.5">
                          <Lock size={14} /> Locked
                        </div>
                      ) : (
                        <Link href={`/principal/stage/${stage.id}`}>
                          <button
                            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                            style={{ backgroundColor: STRIPE_COLORS[colorIdx], color: STRIPE_TEXT[colorIdx] }}
                          >
                            {passed ? 'Review' : attempted ? 'Continue' : 'Start'}
                            <ChevronRight size={16} />
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>

                  {!locked && (
                    <div className="flex items-center gap-4 mt-4 text-xs text-charcoal/50">
                      <span className="flex items-center gap-1">
                        <BookOpen size={12} /> {stage._count?.questions ?? 0} questions
                      </span>
                      {stage.progress?.attempts ? (
                        <span>Attempt {stage.progress.attempts}</span>
                      ) : null}
                      {stage.progress?.bestScore != null && (
                        <span>Best: {stage.progress.bestScore}%</span>
                      )}
                      {passed && stage.badgeTitle && (
                        <span className="flex items-center gap-1">🏅 {stage.badgeTitle}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {stages.length === 0 && (
          <div className="text-center py-16 text-charcoal/40">
            <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
            <p>No stages assigned for principals yet.</p>
          </div>
        )}
      </div>

      {allDone && (
        <div className="mt-6 bg-olive/10 border border-olive/30 rounded-2xl p-5 flex items-center gap-4">
          <Trophy size={32} className="text-olive flex-shrink-0" />
          <div>
            <p className="font-bold text-midnight">All Stages Complete!</p>
            <p className="text-sm text-charcoal/60">You have completed your full PD journey.</p>
          </div>
        </div>
      )}
    </div>
  )
}
