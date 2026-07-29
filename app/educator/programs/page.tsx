'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Layers, CheckCircle, Lock, ChevronRight, BookOpen, Award, Play, LogIn } from 'lucide-react'

interface Program {
  id: string
  name: string
  description: string | null
  isPublished: boolean
  applicableTo: string
  enrolled: boolean
  _count: { stages: number }
}

const PALETTE = ['#033D4C', '#225632', '#7D783E', '#FECB08', '#40403E']
const PALETTE_TEXT = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#033D4C', '#FFFFFF']

export default function EducatorProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState<string | null>(null)

  async function load() {
    const [progRes, enrollRes] = await Promise.all([
      fetch('/api/programs?published=true'),
      fetch('/api/auth/me'),
    ])
    const progs: Program[] = progRes.ok ? await progRes.json() : []

    // Check enrollment status via dashboard data (it includes enrolled flag)
    const dashRes = await fetch('/api/progress')
    const dashData = dashRes.ok ? await dashRes.json() : []

    // Cross-reference enrolled programs from progress API
    const enrolledIds = new Set<string>(Array.isArray(dashData) ? dashData.map((p: { id: string }) => p.id) : [])

    setPrograms(progs.map((p) => ({ ...p, enrolled: enrolledIds.has(p.id) })))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function enroll(programId: string) {
    setEnrolling(programId)
    const res = await fetch(`/api/programs/${programId}/enroll`, { method: 'POST' })
    if (res.ok) await load()
    setEnrolling(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const published = programs.filter((p) => p.isPublished)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-midnight flex items-center gap-2">
          <Layers size={22} /> Programs
        </h1>
        <p className="text-sm text-charcoal/60 mt-0.5">Training programs available at your school — start or continue your learning</p>
      </div>

      {published.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-charcoal/30">
          <Layers size={48} className="mb-4 opacity-20" />
          <p className="text-base font-medium">No programs available yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {published.map((p, i) => {
            const bg = PALETTE[i % PALETTE.length]
            const fg = PALETTE_TEXT[i % PALETTE_TEXT.length]
            const isEnrolling = enrolling === p.id
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-stretch">
                  <div className="w-2 flex-shrink-0" style={{ backgroundColor: bg }} />
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
                          <BookOpen size={20} style={{ color: fg }} />
                        </div>
                        <div>
                          <h2 className="font-bold text-midnight text-lg">{p.name}</h2>
                          {p.description && <p className="text-sm text-charcoal/60 mt-1">{p.description}</p>}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-charcoal/40 flex items-center gap-1">
                              <BookOpen size={11} /> {p._count.stages} stage{p._count.stages !== 1 ? 's' : ''}
                            </span>
                            {p.enrolled && (
                              <span className="text-xs text-forest font-semibold flex items-center gap-1 bg-forest/10 px-2 py-0.5 rounded-full">
                                <CheckCircle size={11} /> Enrolled
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {p.enrolled ? (
                          <Link href="/educator/dashboard">
                            <button className="flex items-center gap-1.5 text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
                              style={{ backgroundColor: bg, color: fg }}>
                              <Play size={14} /> Continue <ChevronRight size={14} />
                            </button>
                          </Link>
                        ) : (
                          <button
                            onClick={() => enroll(p.id)}
                            disabled={isEnrolling}
                            className="flex items-center gap-1.5 text-sm font-bold px-5 py-2.5 rounded-xl border-2 transition-colors hover:text-white disabled:opacity-50"
                            style={{ borderColor: bg, color: bg }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = bg; (e.currentTarget as HTMLButtonElement).style.color = fg }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = bg }}>
                            <LogIn size={14} /> {isEnrolling ? 'Enrolling…' : 'Start Program'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-midnight/5 rounded-2xl p-5 flex items-start gap-3">
        <Award size={18} className="text-gold flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-midnight">Complete stages to earn your certificate</p>
          <p className="text-xs text-charcoal/50 mt-0.5">Each program has stages with reading material and MCQ tests. Pass all stages to get certified.</p>
        </div>
      </div>
    </div>
  )
}
