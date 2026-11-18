'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, ChevronRight, Layers, Play, Video } from 'lucide-react'

interface Program {
  id: string; title: string; description: string | null; targetClass: string
  isEnrolled: boolean
  contentBlocks: { id: string; type: string }[]
  tests: { id: string; title: string }[]
}

export default function StudentProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [enrollingId, setEnrollingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function enroll(programId: string) {
    setEnrollingId(programId)
    setError('')
    const response = await fetch(`/api/student-programs/${programId}/enroll`, { method: 'POST' })
    const data = await response.json().catch(() => ({}))
    setEnrollingId(null)
    if (!response.ok) { setError(data.error ?? 'Could not enroll. Please try again.'); return }
    setPrograms((current) => current.map((program) => program.id === programId ? { ...program, isEnrolled: true } : program))
  }

  useEffect(() => {
    fetch('/api/student-programs?student=true')
      .then((response) => response.ok ? response.json() : [])
      .then((data) => setPrograms(Array.isArray(data) ? data : []))
      .catch(() => setPrograms([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-midnight flex items-center gap-2"><Layers size={23} /> Learning Programs</h1>
        <p className="text-sm text-charcoal/60 mt-1">Lessons and tests selected for your class.</p>
      </div>
      {loading ? <div className="py-16 text-center text-charcoal/50">Loading programs…</div> : programs.length === 0 ? (
        <div className="py-16 text-center text-charcoal/50 bg-white rounded-2xl border border-gray-100">No learning programs are available for your class yet.</div>
      ) : (
        <div className="grid gap-4">
          {programs.map((program) => (
            <div key={program.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 hover:border-midnight/30 transition-all">
              <Link href={program.isEnrolled ? `/student/programs/${program.id}` : '#'} onClick={(event) => { if (!program.isEnrolled) event.preventDefault() }} className="flex items-start gap-4 flex-1 min-w-0">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-midnight/5 flex items-center justify-center text-midnight"><BookOpen size={20} /></div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-midnight">{program.title}</h2>
                  {program.description && <p className="text-sm text-charcoal/60 mt-1">{program.description}</p>}
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-charcoal/50">
                    <span>{program.contentBlocks.length} lessons</span>
                    <span className="inline-flex items-center gap-1"><Play size={12} /> {program.tests.length} tests</span>
                    {program.contentBlocks.some((block) => block.type === 'VIDEO') && <span className="inline-flex items-center gap-1"><Video size={12} /> Videos</span>}
                  </div>
                </div>
                <ChevronRight size={18} className="mt-2 text-charcoal/30" />
              </div>
              </Link>
              {program.isEnrolled ? (
                <Link href={`/student/programs/${program.id}`} className="shrink-0 px-4 py-2 rounded-xl bg-midnight text-white text-sm font-semibold">Open</Link>
              ) : (
                <button type="button" onClick={() => enroll(program.id)} disabled={enrollingId === program.id} className="shrink-0 px-4 py-2 rounded-xl bg-forest text-white text-sm font-semibold disabled:opacity-50">
                  {enrollingId === program.id ? 'Enrolling…' : 'Enroll'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {error && <p role="alert" className="mt-4 text-sm text-red-700 bg-red-50 rounded-xl p-3">{error}</p>}
    </div>
  )
}
