'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Lock, CheckCircle, ChevronRight, BookOpen, Award } from 'lucide-react'

interface StageData {
  id: string; number: number; title: string; subtitle: string
  week: string; docUrl: string | null; isPublished: boolean
  isUnlocked: boolean
  _count: { questions: number }
  progress: { passed: boolean; bestScore: number | null; attempts: number; docRead: boolean } | null
}

const STAGE_COLORS = ['#033D4C', '#225632', '#7D783E', '#FECB08', '#033D4C']
const STAGE_TEXT = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#033D4C', '#FFFFFF']

export default function EducatorDashboard() {
  const [stages, setStages] = useState<StageData[]>([])
  const [user, setUser] = useState<{ name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/progress').then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.json()),
    ]).then(([s, m]) => {
      setStages(s)
      setUser(m.user)
    }).finally(() => setLoading(false))
  }, [])

  const passedCount = stages.filter((s) => s.progress?.passed).length
  const allDone = passedCount === 5

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-midnight">
          Welcome, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-charcoal/60 text-sm mt-1">Your RYSEN Learning Journey</p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-midnight">Overall Progress</span>
          <span className="text-sm font-bold text-midnight">{passedCount}/5 stages</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-midnight rounded-full transition-all duration-500"
            style={{ width: `${(passedCount / 5) * 100}%` }}
          />
        </div>
        {allDone && (
          <div className="mt-3 flex items-center gap-2 text-sm text-forest font-medium">
            <CheckCircle size={16} />
            All stages complete!
            <Link href="/educator/certificate" className="underline text-midnight">Download Certificate →</Link>
          </div>
        )}
      </div>

      {/* Stages */}
      <div className="flex flex-col gap-4">
        {stages.map((stage, i) => {
          const passed = stage.progress?.passed ?? false
          const attempted = (stage.progress?.attempts ?? 0) > 0
          const locked = !stage.isUnlocked || !stage.isPublished

          return (
            <div
              key={stage.id}
              className={`bg-white rounded-2xl border overflow-hidden transition-all ${locked ? 'border-gray-100 opacity-60' : passed ? 'border-green-100' : 'border-gold/30 shadow-sm'}`}
            >
              <div className="flex items-stretch">
                {/* Color stripe */}
                <div className="w-1.5" style={{ backgroundColor: STAGE_COLORS[i] }} />

                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Stage number badge */}
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                        style={{ backgroundColor: STAGE_COLORS[i], color: STAGE_TEXT[i] }}
                      >
                        {passed ? <CheckCircle size={22} /> : stage.number}
                      </div>
                      <div>
                        <h3 className="font-bold text-midnight">{stage.title}</h3>
                        <p className="text-sm text-charcoal/60">{stage.subtitle}</p>
                        <p className="text-xs text-charcoal/40 mt-0.5">{stage.week}</p>
                      </div>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-2">
                      {passed && (
                        <span className="flex items-center gap-1 text-xs bg-forest/10 text-forest px-2.5 py-1 rounded-full font-medium">
                          <Award size={12} /> Passed {stage.progress?.bestScore}%
                        </span>
                      )}
                      {locked ? (
                        <div className="flex items-center gap-1 text-xs text-charcoal/40 px-3 py-1.5">
                          <Lock size={14} /> Locked
                        </div>
                      ) : (
                        <Link href={`/educator/stage/${stage.id}`}>
                          <button className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                            style={{ backgroundColor: STAGE_COLORS[i], color: STAGE_TEXT[i] }}>
                            {passed ? 'Review' : attempted ? 'Continue' : 'Start'}
                            <ChevronRight size={16} />
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  {!locked && (
                    <div className="flex items-center gap-4 mt-4 text-xs text-charcoal/50">
                      <span className="flex items-center gap-1">
                        <BookOpen size={12} /> {stage._count.questions} questions
                      </span>
                      {stage.progress && (
                        <span>Attempt {stage.progress.attempts}/3</span>
                      )}
                      {stage.progress?.bestScore && (
                        <span>Best: {stage.progress.bestScore}%</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
