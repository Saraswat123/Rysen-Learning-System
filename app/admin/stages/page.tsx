'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, CheckCircle, Circle, Settings } from 'lucide-react'
import Button from '@/components/ui/Button'
import Toast from '@/components/Toast'

interface Stage {
  id: string; number: number; title: string; subtitle: string
  week: string; docUrl: string | null; timeLimitMinutes: number
  passScore: number; maxAttempts: number; isPublished: boolean
  badgeTitle: string | null
  _count: { questions: number }
}

const STAGE_COLORS = ['bg-midnight', 'bg-forest', 'bg-olive', 'bg-gold', 'bg-midnight']
const STAGE_TEXT = ['text-white', 'text-white', 'text-white', 'text-midnight', 'text-white']

export default function StagesPage() {
  const [stages, setStages] = useState<Stage[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  async function load() {
    const data = await fetch('/api/stages').then((r) => r.json())
    setStages(data)
  }

  useEffect(() => { load() }, [])

  async function togglePublish(stage: Stage) {
    const res = await fetch(`/api/stages/${stage.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !stage.isPublished }),
    })
    if (res.ok) {
      setToast({ msg: `Stage ${stage.number} ${!stage.isPublished ? 'published' : 'unpublished'}`, type: 'success' })
      load()
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-midnight">Training Stages</h1>
        <p className="text-sm text-charcoal/60">Configure Google Docs, MCQs, timers, and badges for each stage</p>
      </div>

      <div className="flex flex-col gap-4">
        {stages.map((stage, i) => (
          <div key={stage.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-stretch">
              {/* Color band */}
              <div className={`${STAGE_COLORS[i]} ${STAGE_TEXT[i]} w-2`} />

              <div className="flex-1 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`${STAGE_COLORS[i]} ${STAGE_TEXT[i]} w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0`}>
                      {stage.number}
                    </div>
                    <div>
                      <h3 className="font-bold text-midnight">{stage.title}</h3>
                      <p className="text-sm text-charcoal/60">{stage.subtitle} · {stage.week}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => togglePublish(stage)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${stage.isPublished ? 'bg-forest/10 text-forest hover:bg-forest/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {stage.isPublished ? <CheckCircle size={14} /> : <Circle size={14} />}
                      {stage.isPublished ? 'Published' : 'Draft'}
                    </button>
                    <Link href={`/admin/stages/${stage.id}`}>
                      <Button variant="ghost" size="sm">
                        <Settings size={14} /> Configure
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-6 mt-4 text-xs text-charcoal/60">
                  <span className={`font-medium ${stage.docUrl ? 'text-forest' : 'text-red-500'}`}>
                    {stage.docUrl ? '✓ Doc linked' : '✗ No doc link'}
                  </span>
                  <span>{stage._count.questions} MCQ questions</span>
                  <span>{stage.timeLimitMinutes} min limit</span>
                  <span>{stage.passScore}% pass score</span>
                  <span>{stage.maxAttempts} attempts</span>
                  {stage.badgeTitle && <span className="text-gold font-medium">🏅 {stage.badgeTitle}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
