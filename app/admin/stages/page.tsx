'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, CheckCircle, Circle, Settings, Plus, X, Trash2, ChevronDown, Layers, BookOpen, Zap } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Toast from '@/components/Toast'

interface Program { id: string; name: string; applicableTo: string; isPublished: boolean; order: number }
interface Stage {
  id: string; number: number; title: string; subtitle: string
  week: string; docUrl: string | null; timeLimitMinutes: number
  passScore: number; maxAttempts: number; isPublished: boolean
  badgeTitle: string | null; programId: string | null
  _count: { questions: number }
}

const PALETTE = ['#033D4C', '#225632', '#7D783E', '#FECB08', '#40403E']
const PALETTE_TEXT = ['#fff', '#fff', '#fff', '#033D4C', '#fff']

function StagesInner() {
  const router = useRouter()
  const [stages, setStages] = useState<Stage[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createProgramId, setCreateProgramId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Stage | null>(null)
  const [form, setForm] = useState({ title: '', subtitle: '', week: '' })
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [bulkProgramId, setBulkProgramId] = useState<string>('')
  const [bulkAssigning, setBulkAssigning] = useState(false)
  const [seeding, setSeeding] = useState(false)

  async function load() {
    try {
      const [sr, pr] = await Promise.all([fetch('/api/stages'), fetch('/api/programs')])
      const s = sr.ok ? await sr.json() : []
      const p = pr.ok ? await pr.json() : []
      setStages(Array.isArray(s) ? s : [])
      setPrograms(Array.isArray(p) ? p : [])
    } catch {}
  }

  useEffect(() => { load() }, [])

  async function bulkAssign() {
    if (!bulkProgramId) return
    const unassignedStages = stages.filter((s) => s.programId === null)
    if (unassignedStages.length === 0) return
    setBulkAssigning(true)
    await Promise.all(
      unassignedStages.map((s) =>
        fetch(`/api/stages/${s.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ programId: bulkProgramId }),
        })
      )
    )
    const name = programs.find((p) => p.id === bulkProgramId)?.name ?? 'program'
    setToast({ msg: `${unassignedStages.length} stages moved to ${name}`, type: 'success' })
    setBulkProgramId('')
    setBulkAssigning(false)
    load()
  }

  async function seedOrientationMCQ() {
    setSeeding(true)
    const res = await fetch('/api/admin/seed-orientation-mcq', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      const added = (data.results ?? []).filter((r: { questionsAdded: number }) => r.questionsAdded > 0)
      const skipped = (data.results ?? []).filter((r: { skipped: boolean }) => r.skipped)
      setToast({ msg: `Added questions to ${added.length} stage${added.length !== 1 ? 's' : ''}${skipped.length ? ` · ${skipped.length} skipped (already had questions)` : ''}`, type: 'success' })
      load()
    } else {
      setToast({ msg: data.error ?? 'Seed failed', type: 'error' })
    }
    setSeeding(false)
  }

  async function assignProgram(stage: Stage, programId: string | null) {
    await fetch(`/api/stages/${stage.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programId }),
    })
    const name = programId ? programs.find((p) => p.id === programId)?.name ?? 'program' : 'Unassigned'
    setToast({ msg: `"${stage.title}" moved to ${name}`, type: 'success' })
    load()
  }

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
        programId: createProgramId ?? null,
        timeLimitMinutes: 30,
        passScore: 80,
        maxAttempts: 3,
        isPublished: false,
        badgeTitle: null,
        badgeColor: '#033D4C',
        applicableTo: 'BOTH',
        docUrl: null, docs: [], weeks: [],
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

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Group stages by program
  const stagesByProgram = new Map<string | null, Stage[]>()
  stagesByProgram.set(null, [])
  for (const p of programs) stagesByProgram.set(p.id, [])
  for (const s of stages) {
    const key = s.programId ?? null
    if (!stagesByProgram.has(key)) stagesByProgram.set(key, [])
    stagesByProgram.get(key)!.push(s)
  }

  const unassigned = stagesByProgram.get(null) ?? []

  function StageRow({ stage, i }: { stage: Stage; i: number }) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-stretch">
          <div className="w-1.5 rounded-l-xl flex-shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
          <div className="flex-1 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: PALETTE[i % PALETTE.length], color: PALETTE_TEXT[i % PALETTE_TEXT.length] }}>
                  {stage.number}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-midnight text-sm truncate">{stage.title}</h3>
                  <p className="text-xs text-charcoal/50 truncate">{stage.subtitle}{stage.week ? ` · ${stage.week}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => togglePublish(stage)}
                  className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${stage.isPublished ? 'bg-forest/10 text-forest' : 'bg-gray-100 text-gray-400'}`}>
                  {stage.isPublished ? <CheckCircle size={11} /> : <Circle size={11} />}
                  {stage.isPublished ? 'Published' : 'Draft'}
                </button>
                <Link href={`/admin/stages/${stage.id}`}>
                  <button className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-midnight/5 text-midnight hover:bg-midnight/10 transition-colors">
                    <Settings size={11} /> Configure
                  </button>
                </Link>
                <button onClick={() => setConfirmDelete(stage)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
              <span className={`text-xs ${stage.docUrl ? 'text-forest' : 'text-red-400'}`}>
                {stage.docUrl ? '✓ Doc linked' : '✗ No doc link'}
              </span>
              <span className="text-xs text-charcoal/50 flex items-center gap-1"><BookOpen size={10} /> {stage._count.questions} questions</span>
              <span className="text-xs text-charcoal/50">{stage.timeLimitMinutes} min</span>
              <span className="text-xs text-charcoal/50">{stage.passScore}% pass</span>
              {stage.badgeTitle && <span className="text-xs text-gold font-medium">🏅 {stage.badgeTitle}</span>}
              <select
                value={stage.programId ?? ''}
                onChange={(e) => assignProgram(stage, e.target.value || null)}
                onClick={(e) => e.stopPropagation()}
                className="ml-auto text-xs border border-gray-200 rounded-lg px-2 py-1 text-charcoal focus:outline-none focus:ring-1 focus:ring-midnight/30 bg-gray-50">
                <option value="">— No program —</option>
                {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-midnight">Stages & MCQ</h1>
          <p className="text-sm text-charcoal/60 mt-0.5">{stages.length} stages across {programs.length} programs</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/programs">
            <Button variant="ghost" size="sm"><Layers size={14} /> Manage Programs</Button>
          </Link>
          <Button variant="ghost" size="sm" loading={seeding} onClick={seedOrientationMCQ}>
            <Zap size={14} /> Seed Orientation MCQ
          </Button>
          <Button onClick={() => { setCreateProgramId(null); setShowCreate(true) }} size="sm">
            <Plus size={14} /> New Stage
          </Button>
        </div>
      </div>

      {/* Programs with stages nested */}
      {programs.length === 0 ? (
        <div className="text-center py-12 text-charcoal/40">
          <Layers size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No programs yet. <Link href="/admin/programs" className="text-midnight underline">Create a program first</Link>.</p>
        </div>
      ) : (
        programs.map((program, pi) => {
          const progStages = stagesByProgram.get(program.id) ?? []
          const isOpen = !collapsed.has(program.id)
          return (
            <div key={program.id} className="border border-gray-200 rounded-2xl overflow-hidden">
              {/* Program header */}
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer select-none hover:bg-gray-50 transition-colors"
                style={{ background: isOpen ? PALETTE[pi % PALETTE.length] : undefined }}
                onClick={() => toggleCollapse(program.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: isOpen ? 'rgba(255,255,255,0.15)' : PALETTE[pi % PALETTE.length] }}>
                    <Layers size={15} style={{ color: isOpen ? PALETTE_TEXT[pi % PALETTE_TEXT.length] : '#fff' }} />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm" style={{ color: isOpen ? PALETTE_TEXT[pi % PALETTE_TEXT.length] : '#033D4C' }}>
                      {program.name}
                    </h2>
                    <p className="text-xs" style={{ color: isOpen ? 'rgba(255,255,255,0.6)' : '#6b6a67' }}>
                      {progStages.length} stage{progStages.length !== 1 ? 's' : ''}
                      {' · '}
                      {program.applicableTo === 'BOTH' ? 'Educators + Principals' : program.applicableTo}
                      {!program.isPublished && ' · Draft'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setCreateProgramId(program.id); setShowCreate(true) }}
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: isOpen ? 'rgba(255,255,255,0.2)' : 'rgba(3,61,76,0.08)', color: isOpen ? PALETTE_TEXT[pi % PALETTE_TEXT.length] : '#033D4C' }}>
                    <Plus size={12} /> Add Stage
                  </button>
                  <ChevronDown size={16}
                    style={{ color: isOpen ? PALETTE_TEXT[pi % PALETTE_TEXT.length] : '#6b6a67', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>
              </div>

              {/* Stages list */}
              {isOpen && (
                <div className="p-4 flex flex-col gap-3 bg-white">
                  {progStages.length === 0 ? (
                    <div className="text-center py-8 text-charcoal/30">
                      <p className="text-sm">No stages in this program yet.</p>
                      <button
                        onClick={() => { setCreateProgramId(program.id); setShowCreate(true) }}
                        className="mt-2 text-xs font-semibold text-midnight underline">
                        Add first stage
                      </button>
                    </div>
                  ) : (
                    progStages.map((stage, i) => <StageRow key={stage.id} stage={stage} i={i} />)
                  )}
                </div>
              )}
            </div>
          )
        })
      )}

      {/* Unassigned stages */}
      {unassigned.length > 0 && (
        <div className="border border-dashed border-amber-300 rounded-2xl overflow-hidden bg-amber-50/30">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => toggleCollapse('__unassigned__')}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Layers size={15} className="text-amber-600" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-amber-700">Unassigned Stages ({unassigned.length})</h2>
                  <p className="text-xs text-amber-500">These stages won't appear in any program until assigned</p>
                </div>
              </div>
              <ChevronDown size={16} className={`text-amber-400 transition-transform ${collapsed.has('__unassigned__') ? '' : 'rotate-180'}`} />
            </div>
            {/* Bulk assign bar */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-amber-200" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs font-semibold text-amber-700 whitespace-nowrap">Move all to:</span>
              <select
                value={bulkProgramId}
                onChange={(e) => setBulkProgramId(e.target.value)}
                className="flex-1 text-xs border border-amber-200 rounded-lg px-2.5 py-1.5 bg-white text-charcoal focus:outline-none focus:ring-1 focus:ring-amber-400">
                <option value="">— Select program —</option>
                {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button
                onClick={bulkAssign}
                disabled={!bulkProgramId || bulkAssigning}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-midnight text-white disabled:opacity-40 hover:bg-midnight/80 transition-colors whitespace-nowrap">
                {bulkAssigning ? 'Moving…' : `Move all ${unassigned.length}`}
              </button>
            </div>
          </div>
          {!collapsed.has('__unassigned__') && (
            <div className="px-4 pb-4 flex flex-col gap-3">
              {unassigned.map((stage, i) => <StageRow key={stage.id} stage={stage} i={i} />)}
            </div>
          )}
        </div>
      )}

      {stages.length === 0 && programs.length > 0 && (
        <div className="text-center py-12 text-charcoal/40">
          <p className="text-sm">No stages yet. Click "Add Stage" inside a program to get started.</p>
        </div>
      )}

      {/* Create stage modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-midnight">New Stage</h3>
                {createProgramId && (
                  <p className="text-xs text-charcoal/50 mt-0.5">
                    Adding to: <span className="font-semibold text-midnight">{programs.find((p) => p.id === createProgramId)?.name}</span>
                  </p>
                )}
                {!createProgramId && (
                  <p className="text-xs text-amber-600 mt-0.5">Not assigned to any program</p>
                )}
              </div>
              <button onClick={() => setShowCreate(false)} className="text-charcoal/40 hover:text-midnight"><X size={20} /></button>
            </div>
            {!createProgramId && programs.length > 0 && (
              <div className="mb-4">
                <label className="text-sm font-semibold text-charcoal mb-1 block">Assign to Program</label>
                <select
                  onChange={(e) => setCreateProgramId(e.target.value || null)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight/30">
                  <option value="">No program (unassigned)</option>
                  {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-4">
              <Input label="Stage Title *" placeholder="e.g. Welcome Week"
                value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              <Input label="Subtitle" placeholder="e.g. RYSEN Story & Culture"
                value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} />
              <Input label="Period / Week Label" placeholder="e.g. Week 1"
                value={form.week} onChange={(e) => setForm((f) => ({ ...f, week: e.target.value }))} />
              <p className="text-xs text-charcoal/40">Stage number auto-assigned within program.</p>
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

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-midnight mb-2">Delete Stage?</h3>
            <p className="text-sm text-charcoal/60 mb-1">
              <strong className="text-midnight">Stage {confirmDelete.number}: {confirmDelete.title}</strong>
            </p>
            <p className="text-sm text-red-500 mb-6">All questions and educator progress will be permanently deleted.</p>
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
