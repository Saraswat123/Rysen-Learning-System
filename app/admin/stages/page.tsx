'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, CheckCircle, Circle, Settings, Plus, X, Trash2, ArrowLeft } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Toast from '@/components/Toast'

interface Program { id: string; name: string; applicableTo: string }
interface Stage {
  id: string; number: number; title: string; subtitle: string
  week: string; docUrl: string | null; timeLimitMinutes: number
  passScore: number; maxAttempts: number; isPublished: boolean
  badgeTitle: string | null; programId: string | null
  _count: { questions: number }
}

const PALETTE = ['bg-midnight', 'bg-forest', 'bg-olive', 'bg-gold', 'bg-charcoal']
const PALETTE_TEXT = ['text-white', 'text-white', 'text-white', 'text-midnight', 'text-white']
const stageColor = (i: number) => PALETTE[i % PALETTE.length]
const stageText = (i: number) => PALETTE_TEXT[i % PALETTE_TEXT.length]

function StagesInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const programId = searchParams.get('programId')

  const [stages, setStages] = useState<Stage[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [activeProgram, setActiveProgram] = useState<Program | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Stage | null>(null)
  const [form, setForm] = useState({ title: '', subtitle: '', week: '' })

  async function load() {
    try {
      const url = programId ? `/api/stages?programId=${programId}` : '/api/stages'
      const [sr, pr] = await Promise.all([fetch(url), fetch('/api/programs')])
      const s = sr.ok ? await sr.json() : []
      const p = pr.ok ? await pr.json() : []
      setStages(Array.isArray(s) ? s : [])
      setPrograms(Array.isArray(p) ? p : [])
      if (programId) {
        const prog = (Array.isArray(p) ? p : []).find((x: Program) => x.id === programId) ?? null
        setActiveProgram(prog)
      } else {
        setActiveProgram(null)
      }
    } catch {}
  }

  useEffect(() => { load() }, [programId]) // eslint-disable-line

  async function togglePublish(stage: Stage) {
    await fetch(`/api/stages/${stage.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !stage.isPublished }),
    })
    setToast({ msg: `Stage ${stage.number} ${!stage.isPublished ? 'published' : 'unpublished'}`, type: 'success' })
    load()
  }

  async function deleteStage(stage: Stage) {
    const res = await fetch(`/api/stages/${stage.id}`, { method: 'DELETE' })
    if (res.ok) {
      setToast({ msg: `Stage ${stage.number} deleted`, type: 'success' })
      setConfirmDelete(null)
      load()
    } else {
      setToast({ msg: 'Failed to delete', type: 'error' })
    }
  }

  async function createStage() {
    if (!form.title.trim()) return
    setCreating(true)
    const res = await fetch('/api/stages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        week: form.week.trim() || null,
        programId: programId ?? null,
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
      const created = await res.json()
      setToast({ msg: `Stage ${created.number} created`, type: 'success' })
      setShowCreate(false)
      setForm({ title: '', subtitle: '', week: '' })
      load()
    } else {
      const err = await res.json().catch(() => ({}))
      setToast({ msg: err.error ?? 'Failed to create stage', type: 'error' })
    }
    setCreating(false)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="mb-6">
        {activeProgram ? (
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => router.push('/admin/programs')} className="flex items-center gap-1.5 text-sm text-charcoal/50 hover:text-midnight transition-colors">
              <ArrowLeft size={15} /> All Programs
            </button>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-midnight">
              {activeProgram ? activeProgram.name : 'All Stages'}
            </h1>
            <p className="text-sm text-charcoal/60">
              {activeProgram ? 'Stages in this program' : 'All stages across all programs'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!activeProgram && programs.length > 0 && (
              <Link href="/admin/programs">
                <Button variant="ghost" size="sm">Manage Programs</Button>
              </Link>
            )}
            <Button onClick={() => setShowCreate(true)} size="sm"><Plus size={14} /> New Stage</Button>
          </div>
        </div>
      </div>

      {/* Program tabs (when showing all) */}
      {!activeProgram && programs.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => router.push('/admin/stages')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!programId ? 'bg-midnight text-white' : 'bg-gray-100 text-charcoal/60 hover:bg-gray-200'}`}>
            All
          </button>
          {programs.map((p) => (
            <button key={p.id} onClick={() => router.push(`/admin/stages?programId=${p.id}`)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors bg-gray-100 text-charcoal/60 hover:bg-gray-200">
              {p.name}
            </button>
          ))}
        </div>
      )}

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
                      <p className="text-sm text-charcoal/60">
                        {stage.subtitle}{stage.week ? ` · ${stage.week}` : ''}
                        {!activeProgram && stage.programId && (
                          <span className="ml-2 text-xs bg-midnight/5 text-midnight px-1.5 py-0.5 rounded">
                            {programs.find((p) => p.id === stage.programId)?.name ?? 'Program'}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => togglePublish(stage)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${stage.isPublished ? 'bg-forest/10 text-forest hover:bg-forest/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {stage.isPublished ? <CheckCircle size={14} /> : <Circle size={14} />}
                      {stage.isPublished ? 'Published' : 'Draft'}
                    </button>
                    <Link href={`/admin/stages/${stage.id}`}>
                      <Button variant="ghost" size="sm"><Settings size={14} /> Configure</Button>
                    </Link>
                    <button onClick={() => setConfirmDelete(stage)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                      <Trash2 size={15} />
                    </button>
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
            <p className="text-sm">No stages yet. Create the first stage{activeProgram ? ` for ${activeProgram.name}` : ''}.</p>
          </div>
        )}
      </div>

      {/* Create stage modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-midnight">
                New Stage{activeProgram ? ` — ${activeProgram.name}` : ''}
              </h3>
              <button onClick={() => setShowCreate(false)} className="text-charcoal/40 hover:text-midnight"><X size={20} /></button>
            </div>
            <div className="flex flex-col gap-4">
              <Input label="Stage Title *" placeholder="e.g. Foundations of Teaching"
                value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              <Input label="Subtitle" placeholder="e.g. Core pedagogy concepts"
                value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} />
              <Input label="Period Label" placeholder="e.g. Weeks 1–4"
                value={form.week} onChange={(e) => setForm((f) => ({ ...f, week: e.target.value }))} />
              {!activeProgram && programs.length > 0 && (
                <p className="text-xs text-amber-600">Tip: open a specific program first to assign stages to it.</p>
              )}
              <p className="text-xs text-charcoal/40">Stage number auto-assigned.</p>
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

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-midnight mb-2">Delete Stage?</h3>
            <p className="text-sm text-charcoal/60 mb-1">
              <strong className="text-midnight">Stage {confirmDelete.number}: {confirmDelete.title}</strong>
            </p>
            <p className="text-sm text-red-500 mb-6">All questions and educator progress for this stage will be permanently deleted.</p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <button onClick={() => deleteStage(confirmDelete)}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-sm transition-colors">
                Delete Stage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function StagesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" /></div>}>
      <StagesInner />
    </Suspense>
  )
}
