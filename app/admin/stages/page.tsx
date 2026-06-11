'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, CheckCircle, Circle, Settings, Plus, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Toast from '@/components/Toast'

interface Stage {
  id: string; number: number; title: string; subtitle: string
  week: string; docUrl: string | null; timeLimitMinutes: number
  passScore: number; maxAttempts: number; isPublished: boolean
  badgeTitle: string | null
  _count: { questions: number }
}

const PALETTE = ['bg-midnight', 'bg-forest', 'bg-olive', 'bg-gold', 'bg-charcoal']
const PALETTE_TEXT = ['text-white', 'text-white', 'text-white', 'text-midnight', 'text-white']

function stageColor(i: number) { return PALETTE[i % PALETTE.length] }
function stageText(i: number) { return PALETTE_TEXT[i % PALETTE_TEXT.length] }

export default function StagesPage() {
  const [stages, setStages] = useState<Stage[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', subtitle: '', week: '' })

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

  async function createStage() {
    if (!form.title.trim()) return
    setCreating(true)
    const nextNumber = (stages.length > 0 ? Math.max(...stages.map((s) => s.number)) : 0) + 1
    const res = await fetch('/api/stages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: nextNumber,
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        week: form.week.trim() || null,
        timeLimitMinutes: 30,
        passScore: 80,
        maxAttempts: 3,
        isPublished: false,
        badgeTitle: null,
        badgeColor: '#033D4C',
        applicableTo: 'BOTH',
        docUrl: null,
        docs: [],
        weeks: [],
      }),
    })
    if (res.ok) {
      setToast({ msg: `Stage ${nextNumber} created`, type: 'success' })
      setShowCreate(false)
      setForm({ title: '', subtitle: '', week: '' })
      load()
    } else {
      setToast({ msg: 'Failed to create stage', type: 'error' })
    }
    setCreating(false)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-midnight">Training Stages</h1>
          <p className="text-sm text-charcoal/60">Configure Google Docs, MCQs, timers, and badges for each stage</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus size={14} /> New Stage
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {stages.map((stage, i) => (
          <div key={stage.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-stretch">
              <div className={`${stageColor(i)} w-2`} />

              <div className="flex-1 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`${stageColor(i)} ${stageText(i)} w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0`}>
                      {stage.number}
                    </div>
                    <div>
                      <h3 className="font-bold text-midnight">{stage.title}</h3>
                      <p className="text-sm text-charcoal/60">{stage.subtitle} {stage.week ? `· ${stage.week}` : ''}</p>
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

                <div className="flex items-center gap-6 mt-4 text-xs text-charcoal/60">
                  <span className={`font-medium ${stage.docUrl ? 'text-forest' : 'text-red-500'}`}>
                    {stage.docUrl ? '✓ Doc linked' : '✗ No doc link'}
                  </span>
                  <span>{stage._count.questions} questions</span>
                  <span>{stage.timeLimitMinutes} min limit</span>
                  <span>{stage.passScore}% pass score</span>
                  <span>{stage.maxAttempts} attempts</span>
                  {stage.badgeTitle && <span className="text-gold font-medium">🏅 {stage.badgeTitle}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}

        {stages.length === 0 && (
          <div className="text-center py-16 text-charcoal/40">
            <p className="text-sm">No stages yet. Create your first stage.</p>
          </div>
        )}
      </div>

      {/* Create Stage Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-midnight">New Stage</h3>
              <button onClick={() => setShowCreate(false)} className="text-charcoal/40 hover:text-midnight"><X size={20} /></button>
            </div>
            <div className="flex flex-col gap-4">
              <Input label="Stage Title *" placeholder="e.g. Advanced Pedagogy"
                value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              <Input label="Subtitle" placeholder="e.g. Deep-dive into instructional design"
                value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} />
              <Input label="Period Label" placeholder="e.g. Weeks 9–12"
                value={form.week} onChange={(e) => setForm((f) => ({ ...f, week: e.target.value }))} />
              <p className="text-xs text-charcoal/40">
                Stage number auto-assigned as {(stages.length > 0 ? Math.max(...stages.map((s) => s.number)) : 0) + 1}.
                Settings (timer, pass score, docs, MCQs) configured after creation.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="ghost" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button className="flex-1" loading={creating} onClick={createStage} disabled={!form.title.trim()}>
                Create Stage
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
