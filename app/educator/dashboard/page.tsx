'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Lock, CheckCircle, ChevronRight, BookOpen, Award, Layers } from 'lucide-react'

interface Progress { passed: boolean; bestScore: number | null; attempts: number; docRead: boolean }
interface StageData {
  id: string; number: number; title: string; subtitle: string
  week: string; isPublished: boolean; isUnlocked: boolean
  applicableTo: string
  _count: { questions: number }
  progress: Progress | null
}
interface ProgramData {
  id: string; name: string; description: string | null
  isPublished: boolean; applicableTo: string
  stages: StageData[]
}

const PALETTE = ['#033D4C', '#225632', '#7D783E', '#FECB08', '#40403E']
const PALETTE_TEXT = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#033D4C', '#FFFFFF']
const col = (i: number) => PALETTE[i % PALETTE.length]
const colText = (i: number) => PALETTE_TEXT[i % PALETTE_TEXT.length]

function StageCard({ stage, i, base }: { stage: StageData; i: number; base: string }) {
  const passed = stage.progress?.passed ?? false
  const attempted = (stage.progress?.attempts ?? 0) > 0
  const locked = !stage.isUnlocked || !stage.isPublished
  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all ${locked ? 'border-gray-100 opacity-60' : passed ? 'border-green-100' : 'border-gold/30 shadow-sm'}`}>
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
                <span className="flex items-center gap-1 text-xs bg-forest/10 text-forest px-2.5 py-1 rounded-full font-medium">
                  <Award size={12} /> {stage.progress?.bestScore}%
                </span>
              )}
              {locked ? (
                <div className="flex items-center gap-1 text-xs text-charcoal/40 px-3 py-1.5"><Lock size={14} /> Locked</div>
              ) : (
                <Link href={`${base}/${stage.id}`}>
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
              <span className="flex items-center gap-1"><BookOpen size={12} /> {stage._count.questions} questions</span>
              {stage.progress && <span>Attempt {stage.progress.attempts}</span>}
              {stage.progress?.bestScore && <span>Best: {stage.progress.bestScore}%</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EducatorDashboard() {
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
        (p) => p.isPublished && (p.applicableTo === 'BOTH' || p.applicableTo === 'EDUCATOR') &&
          p.stages.some((s) => s.applicableTo === 'BOTH' || s.applicableTo === 'EDUCATOR')
      )
      setPrograms(visPrograms)
      setUnassigned((d.unassigned as StageData[]).filter((s) => s.applicableTo === 'BOTH' || s.applicableTo === 'EDUCATOR'))
      setUser(m.user)
    }).finally(() => setLoading(false))
  }, [])

  const totalPassed = [...programs.flatMap((p) => p.stages), ...unassigned].filter((s) => s.progress?.passed).length
  const totalVisible = [...programs.flatMap((p) => p.stages), ...unassigned].length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-midnight">Welcome, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-charcoal/60 text-sm mt-1">Your RYSEN Learning Journey</p>
      </div>

      {totalVisible > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-midnight">Overall Progress</span>
            <span className="text-sm font-bold text-midnight">{totalPassed}/{totalVisible} stages</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-midnight rounded-full transition-all duration-500"
              style={{ width: `${totalVisible > 0 ? (totalPassed / totalVisible) * 100 : 0}%` }} />
          </div>
          {totalVisible > 0 && totalPassed === totalVisible && (
            <div className="mt-3 flex items-center gap-2 text-sm text-forest font-medium">
              <CheckCircle size={16} /> All stages complete!
              <Link href="/educator/certificate" className="underline text-midnight">Download Certificate →</Link>
            </div>
          )}
        </div>
      )}

      {/* Programs */}
      {programs.map((program) => {
        const progStages = program.stages.filter((s) => s.applicableTo === 'BOTH' || s.applicableTo === 'EDUCATOR')
        const progPassed = progStages.filter((s) => s.progress?.passed).length
        return (
          <div key={program.id} className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-midnight/50" />
                <h2 className="text-base font-bold text-midnight">{program.name}</h2>
                {program.description && <span className="text-xs text-charcoal/40 hidden sm:inline">— {program.description}</span>}
              </div>
              <span className="text-xs text-charcoal/50 font-medium">{progPassed}/{progStages.length} passed</span>
            </div>
            <div className="flex flex-col gap-3">
              {progStages.map((stage, i) => (
                <StageCard key={stage.id} stage={stage} i={i} base="/educator/stage" />
              ))}
              {progStages.length === 0 && (
                <p className="text-sm text-charcoal/40 text-center py-4">No stages in this program yet.</p>
              )}
            </div>
          </div>
        )
      })}

      {/* Unassigned stages (legacy / no program) */}
      {unassigned.length > 0 && (
        <div className="mb-8">
          {programs.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-base font-bold text-midnight">Other Stages</h2>
            </div>
          )}
          <div className="flex flex-col gap-3">
            {unassigned.map((stage, i) => (
              <StageCard key={stage.id} stage={stage} i={i} base="/educator/stage" />
            ))}
          </div>
        </div>
      )}

      {programs.length === 0 && unassigned.length === 0 && (
        <div className="text-center py-16 text-charcoal/40">
          <p className="text-sm">No training programs available yet.</p>
        </div>
      )}
    </div>
  )
}
