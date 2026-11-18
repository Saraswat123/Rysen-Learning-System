'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, ChevronRight, Layers, Play, Video } from 'lucide-react'

interface Program {
  id: string; title: string; description: string | null; targetClass: string
  contentBlocks: { id: string; type: string }[]
  tests: { id: string; title: string }[]
}

export default function StudentProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)

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
            <Link key={program.id} href={`/student/programs/${program.id}`} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-midnight/30 hover:shadow-sm transition-all">
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
          ))}
        </div>
      )}
    </div>
  )
}
