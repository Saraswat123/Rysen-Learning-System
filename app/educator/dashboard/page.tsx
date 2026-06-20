'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Lock, CheckCircle, ChevronRight, BookOpen, Award, Layers, Plus, LogIn, GraduationCap } from 'lucide-react'

interface Progress { passed: boolean; bestScore: number | null; attempts: number; docRead: boolean }
interface StageData {
  id: string; number: number; title: string; subtitle: string
  week: string; isPublished: boolean; isUnlocked: boolean; applicableTo: string
  _count: { questions: number }; progress: Progress | null
}
interface ProgramData {
  id: string; name: string; description: string | null
  isPublished: boolean; applicableTo: string; enrolled: boolean
  stages: StageData[]
}

const PALETTE = ['#033D4C', '#225632', '#7D783E', '#FECB08', '#40403E']
const PALETTE_TEXT = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#033D4C', '#FFFFFF']
const col = (i: number) => PALETTE[i % PALETTE.length]
const colText = (i: number) => PALETTE_TEXT[i % PALETTE_TEXT.length]

function StageCard({ stage, i }: { stage: StageData; i: number }) {
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
                <Link href={`/educator/stage/${stage.id}`}>
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
  const [available, setAvailable] = useState<ProgramData[]>([])
  const [unassigned, setUnassigned] = useState<StageData[]>([])
  const [user, setUser] = useState<{ name: string; email?: string; branch?: { name: string } | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState<string | null>(null)

  async function load() {
    const [d, m] = await Promise.all([
      fetch('/api/progress').then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.json()),
    ])
    if (Array.isArray(d)) {
      setUnassigned((d as StageData[]).filter((s) => s.applicableTo === 'BOTH' || s.applicableTo === 'EDUCATOR'))
    } else {
      const isEdu = (p: ProgramData) => p.applicableTo === 'BOTH' || p.applicableTo === 'EDUCATOR'
      const hasStageForMe = (p: ProgramData) =>
        (p.stages ?? []).some((s) => s.applicableTo === 'BOTH' || s.applicableTo === 'EDUCATOR')
      setPrograms(((d.programs ?? []) as ProgramData[]).filter((p) => isEdu(p) && hasStageForMe(p)))
      setAvailable(((d.availablePrograms ?? []) as ProgramData[]).filter(isEdu))
      setUnassigned(((d.unassigned ?? []) as StageData[]).filter((s) => s.applicableTo === 'BOTH' || s.applicableTo === 'EDUCATOR'))
    }
    setUser(m.user)
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  async function enroll(programId: string) {
    setEnrolling(programId)
    await fetch(`/api/programs/${programId}/enroll`, { method: 'POST' })
    await load()
    setEnrolling(null)
  }

  const totalPassed = [...programs.flatMap((p) => p.stages), ...unassigned].filter((s) => s.progress?.passed).length
  const totalVisible = [...programs.flatMap((p) => p.stages), ...unassigned].length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const initials = user?.name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?'

  return (
    <div>
      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-midnight flex items-center justify-center text-white text-lg font-bold flex-shrink-0 select-none">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-midnight text-lg leading-tight">{user?.name}</h2>
          {user?.branch?.name && <p className="text-xs text-charcoal/50 mt-0.5">{user.branch.name}</p>}
          {programs.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {programs.map((p, i) => (
                <span key={p.id}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                  style={{ backgroundColor: PALETTE[i % PALETTE.length], color: i === 3 ? '#033D4C' : '#fff' }}>
                  <Layers size={10} /> {p.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-bold text-midnight">{totalPassed}</p>
          <p className="text-xs text-charcoal/40">stages passed</p>
        </div>
      </div>

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

      {/* Enrolled Programs */}
      {programs.map((program) => {
        const progStages = program.stages.filter((s) => s.applicableTo === 'BOTH' || s.applicableTo === 'EDUCATOR')
        const progPassed = progStages.filter((s) => s.progress?.passed).length
        return (
          <div key={program.id} className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-midnight flex items-center justify-center flex-shrink-0">
                  <Layers size={13} className="text-gold" />
                </div>
                <h2 className="text-base font-bold text-midnight">{program.name}</h2>
                {program.description && <span className="text-xs text-charcoal/40 hidden sm:inline">— {program.description}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-charcoal/50 font-medium">{progPassed}/{progStages.length} passed</span>
                <span className="text-xs bg-forest/10 text-forest px-2 py-0.5 rounded-full font-medium">Enrolled</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {progStages.map((stage, i) => <StageCard key={stage.id} stage={stage} i={i} />)}
              {progStages.length === 0 && <p className="text-sm text-charcoal/40 text-center py-4">No stages yet in this program.</p>}
            </div>
          </div>
        )
      })}

      {/* Unassigned stages */}
      {unassigned.length > 0 && (
        <div className="mb-8">
          {programs.length > 0 && <h2 className="text-base font-bold text-midnight mb-3">Other Stages</h2>}
          <div className="flex flex-col gap-3">
            {unassigned.map((stage, i) => <StageCard key={stage.id} stage={stage} i={i} />)}
          </div>
        </div>
      )}

      {/* Available Programs to Join */}
      {available.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-bold text-midnight">Available Training Programs</h2>
            <span className="text-xs text-charcoal/40">— enroll to access</span>
          </div>
          <div className="flex flex-col gap-3">
            {available.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-dashed border-midnight/20 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-midnight/5 border border-midnight/10 flex items-center justify-center flex-shrink-0">
                      <Layers size={18} className="text-midnight/40" />
                    </div>
                    <div>
                      <h3 className="font-bold text-midnight">{p.name}</h3>
                      {p.description && <p className="text-sm text-charcoal/60 mt-0.5">{p.description}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => enroll(p.id)}
                    disabled={enrolling === p.id}
                    className="flex items-center gap-2 px-4 py-2 bg-midnight text-white text-sm font-semibold rounded-xl hover:bg-midnight/80 disabled:opacity-50 transition-colors flex-shrink-0">
                    {enrolling === p.id
                      ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : <><LogIn size={15} /> Enroll</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {programs.length === 0 && unassigned.length === 0 && available.length === 0 && (
        <div className="text-center py-16 text-charcoal/40">
          <Layers size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No training programs available. Contact your admin.</p>
        </div>
      )}
    </div>
  )
}
