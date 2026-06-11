'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Lock, CheckCircle, ChevronRight, BookOpen, Award, Trophy, Layers } from 'lucide-react'

interface Progress { passed: boolean; bestScore: number | null; attempts: number; docRead: boolean }
interface StageData {
  id: string; number: number; title: string; subtitle: string
  week: string; badgeColor: string; badgeTitle: string | null
  isPublished: boolean; isUnlocked: boolean; applicableTo: string
  _count: { questions: number }
  progress: Progress | null
}
interface ProgramData {
  id: string; name: string; description: string | null
  isPublished: boolean; applicableTo: string
  stages: StageData[]
}

const PALETTE = ['#7D783E', '#033D4C', '#225632', '#FECB08', '#40403E']
const PALETTE_TEXT = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#033D4C', '#FFFFFF']
const col = (i: number) => PALETTE[i % PALETTE.length]
const colText = (i: number) => PALETTE_TEXT[i % PALETTE_TEXT.length]

function StageCard({ stage, i }: { stage: StageData; i: number }) {
  const passed = stage.progress?.passed ?? false
  const attempted = (stage.progress?.attempts ?? 0) > 0
  const locked = !stage.isUnlocked || !stage.isPublished
  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all ${locked ? 'border-gray-100 opacity-60' : passed ? 'border-olive/30' : 'border-gold/30 shadow-sm'}`}>
      <div className="flex items-stretch">
        <div className="w-1.5" style={{ backgroundColor: col(i) }} />
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                style={{ backgroundColor: col(i), color: colText(i) }}>
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
                  <Award size={12} /> {stage.progress?.bestScore}%
                </span>
              )}
              {locked ? (
                <div className="flex items-center gap-1 text-xs text-charcoal/40 px-3 py-1.5"><Lock size={14} /> Locked</div>
              ) : (
                <Link href={`/principal/stage/${stage.id}`}>
                  <button className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                    style={{ backgroundColor: col(i), color: colText(i) }}>
                    {passed ? 'Review' : attempted ? 'Continue' : 'Start'}<ChevronRight size={16} />
                  </button>
                </Link>
              )}
            </div>
          </div>
          {!locked && (
            <div className="flex items-center gap-4 mt-4 text-xs text-charcoal/50">
              <span className="flex items-center gap-1"><BookOpen size={12} /> {stage._count?.questions ?? 0} questions</span>
              {stage.progress?.attempts ? <span>Attempt {stage.progress.attempts}</span> : null}
              {stage.progress?.bestScore != null && <span>Best: {stage.progress.bestScore}%</span>}
              {passed && stage.badgeTitle && <span>🏅 {stage.badgeTitle}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PrincipalMyJourneyPage() {
  const [programs, setPrograms] = useState<ProgramData[]>([])
  const [unassigned, setUnassigned] = useState<StageData[]>([])
  const [user, setUser] = useState<{ name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/progress').then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.json()),
    ]).then(([d, m]) => {
      const visPrograms = (d.programs as ProgramData[]).filter(
        (p) => p.isPublished && (p.applicableTo === 'BOTH' || p.applicableTo === 'PRINCIPAL') &&
          p.stages.some((s) => s.applicableTo === 'BOTH' || s.applicableTo === 'PRINCIPAL')
      )
      setPrograms(visPrograms)
      setUnassigned((d.unassigned as StageData[]).filter((s) => s.applicableTo === 'BOTH' || s.applicableTo === 'PRINCIPAL'))
      setUser(m.user)
    }).finally(() => setLoading(false))
  }, [])

  const allStages = [...programs.flatMap((p) => p.stages), ...unassigned]
  const totalPassed = allStages.filter((s) => s.progress?.passed).length
  const total = allStages.length
  const allDone = total > 0 && totalPassed === total

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-olive border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-midnight">My PD Journey</h1>
        <p className="text-charcoal/60 text-sm mt-1">Welcome, {user?.name?.split(' ')[0]} — your professional development stages</p>
      </div>

      {total > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-midnight">Overall Progress</span>
            <span className="text-sm font-bold text-midnight">{totalPassed}/{total} stages</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-olive rounded-full transition-all duration-500"
              style={{ width: total > 0 ? `${(totalPassed / total) * 100}%` : '0%' }} />
          </div>
          {allDone && (
            <div className="mt-3 flex items-center gap-2 text-sm text-olive font-medium">
              <CheckCircle size={16} /> All stages complete!
            </div>
          )}
        </div>
      )}

      {programs.map((program) => {
        const progStages = program.stages.filter((s) => s.applicableTo === 'BOTH' || s.applicableTo === 'PRINCIPAL')
        const progPassed = progStages.filter((s) => s.progress?.passed).length
        return (
          <div key={program.id} className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-olive/60" />
                <h2 className="text-base font-bold text-midnight">{program.name}</h2>
                {program.description && <span className="text-xs text-charcoal/40 hidden sm:inline">— {program.description}</span>}
              </div>
              <span className="text-xs text-charcoal/50 font-medium">{progPassed}/{progStages.length} passed</span>
            </div>
            <div className="flex flex-col gap-3">
              {progStages.map((stage, i) => <StageCard key={stage.id} stage={stage} i={i} />)}
              {progStages.length === 0 && <p className="text-sm text-charcoal/40 text-center py-4">No stages in this program yet.</p>}
            </div>
          </div>
        )
      })}

      {unassigned.length > 0 && (
        <div className="mb-8">
          {programs.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-base font-bold text-midnight">Other Stages</h2>
            </div>
          )}
          <div className="flex flex-col gap-3">
            {unassigned.map((stage, i) => <StageCard key={stage.id} stage={stage} i={i} />)}
          </div>
        </div>
      )}

      {programs.length === 0 && unassigned.length === 0 && (
        <div className="text-center py-16 text-charcoal/40">
          <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
          <p>No training programs available yet.</p>
        </div>
      )}

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
