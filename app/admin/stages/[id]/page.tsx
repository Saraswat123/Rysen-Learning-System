'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Trash2, Save, Upload, Download, X,
  FileSpreadsheet, ChevronUp, ChevronDown, Link as LinkIcon, BookOpen, Video,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Toast from '@/components/Toast'
import * as XLSX from 'xlsx'

interface Option { id: string; text: string }
interface Question {
  id?: string; type: 'MCQ' | 'TEXT'; text: string; options: Option[]
  correctId: string; explanation: string; order: number
  docGroupId: string | null
}
interface StageDoc { id: string; title: string; url: string; weekId: string | null; order: number; type: 'doc' | 'video' }
interface StageWeek { id: string; label: string; order: number }
interface Stage {
  id: string; number: number; title: string; subtitle: string
  description: string; week: string; docUrl: string
  docs: StageDoc[]; weeks: StageWeek[]; applicableTo: string
  timeLimitMinutes: number; passScore: number; maxAttempts: number
  badgeTitle: string; badgeColor: string; isPublished: boolean
}

function makeOption(): Option { return { id: crypto.randomUUID(), text: '' } }
function makeQ(order: number, docGroupId: string | null = null): Question {
  return { type: 'MCQ', text: '', options: [makeOption(), makeOption(), makeOption(), makeOption()], correctId: '', explanation: '', order, docGroupId }
}
function makeTextQ(order: number, docGroupId: string | null = null): Question {
  return { type: 'TEXT', text: '', options: [], correctId: '', explanation: '', order, docGroupId }
}

export default function StageEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [stage, setStage] = useState<Stage | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importRows, setImportRows] = useState<Question[]>([])
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const importFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/stages/${id}`).then((r) => r.json()).then((data) => {
      setStage({
        ...data,
        docs: (data.docs ?? []).map((d: StageDoc) => ({ ...d, weekId: d.weekId ?? null, type: d.type ?? 'doc' })),
        weeks: data.weeks ?? [],
        applicableTo: data.applicableTo ?? 'BOTH',
      })
      const qs: Question[] = (data.questions ?? []).map((q: Question) => ({ ...q, docGroupId: q.docGroupId ?? null }))
      setQuestions(qs)
    })
  }, [id])

  // ─── Save ───────────────────────────────────────────────────────────────────

  async function saveSettings() {
    if (!stage) return
    setSaving(true)
    const res = await fetch(`/api/stages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: stage.title,
        subtitle: stage.subtitle,
        week: stage.week,
        applicableTo: stage.applicableTo,
        timeLimitMinutes: stage.timeLimitMinutes,
        passScore: stage.passScore,
        maxAttempts: stage.maxAttempts,
        badgeTitle: stage.badgeTitle,
        badgeColor: stage.badgeColor,
        isPublished: stage.isPublished,
      }),
    })
    setToast(res.ok ? { msg: 'Settings saved', type: 'success' } : { msg: 'Failed', type: 'error' })
    setSaving(false)
  }

  async function saveContent() {
    if (!stage) return
    setSaving(true)

    // Save weeks + docs
    await fetch(`/api/stages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weeks: stage.weeks, docs: stage.docs }),
    })

    // Save questions
    const valid = questions.filter((q) =>
      q.text.trim() && (q.type === 'TEXT' || (q.correctId && q.options.every((o) => o.text.trim())))
    )
    const skipped = questions.length - valid.length

    if (valid.length > 0) {
      const res = await fetch(`/api/stages/${id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valid.map((q, i) => ({ ...q, order: i }))),
      })
      if (res.ok) {
        const refreshed = await fetch(`/api/stages/${id}/questions`).then((r) => r.json())
        setQuestions(refreshed.map((q: Question) => ({ ...q, docGroupId: q.docGroupId ?? null })))
        setToast({ msg: skipped > 0 ? `Saved. ${skipped} incomplete skipped.` : 'Content saved', type: skipped > 0 ? 'error' : 'success' })
      } else {
        setToast({ msg: 'Failed to save questions', type: 'error' })
      }
    } else {
      setToast({ msg: 'Content saved (no questions)', type: 'success' })
    }
    setSaving(false)
  }

  // ─── Week helpers ────────────────────────────────────────────────────────────

  function addWeek() {
    const newWeek: StageWeek = { id: crypto.randomUUID(), label: `Week ${(stage?.weeks ?? []).length + 1}`, order: (stage?.weeks ?? []).length }
    setStage((s) => s ? { ...s, weeks: [...(s.weeks ?? []), newWeek] } : s)
  }
  function updateWeekLabel(wid: string, label: string) {
    setStage((s) => s ? { ...s, weeks: s.weeks.map((w) => w.id === wid ? { ...w, label } : w) } : s)
  }
  function removeWeek(wid: string) {
    setStage((s) => s ? {
      ...s,
      weeks: s.weeks.filter((w) => w.id !== wid),
      docs: s.docs.map((d) => d.weekId === wid ? { ...d, weekId: null } : d),
    } : s)
  }
  function moveWeek(wi: number, dir: -1 | 1) {
    setStage((s) => {
      if (!s) return s
      const ws = [...s.weeks]
      const t = wi + dir
      if (t < 0 || t >= ws.length) return s
      ;[ws[wi], ws[t]] = [ws[t], ws[wi]]
      return { ...s, weeks: ws.map((w, i) => ({ ...w, order: i })) }
    })
  }

  // ─── Doc helpers ─────────────────────────────────────────────────────────────

  function addDoc(weekId: string | null, type: 'doc' | 'video' = 'doc') {
    const newDoc: StageDoc = { id: crypto.randomUUID(), title: '', url: '', weekId, order: (stage?.docs ?? []).filter((d) => d.weekId === weekId).length, type }
    setStage((s) => s ? { ...s, docs: [...s.docs, newDoc] } : s)
  }
  function updateDoc(did: string, patch: Partial<StageDoc>) {
    setStage((s) => s ? { ...s, docs: s.docs.map((d) => d.id === did ? { ...d, ...patch } : d) } : s)
  }
  function removeDoc(did: string) {
    setStage((s) => s ? { ...s, docs: s.docs.filter((d) => d.id !== did) } : s)
    setQuestions((qs) => qs.map((q) => q.docGroupId === did ? { ...q, docGroupId: null } : q))
  }
  function moveDocInWeek(did: string, dir: -1 | 1) {
    setStage((s) => {
      if (!s) return s
      const doc = s.docs.find((d) => d.id === did)
      if (!doc) return s
      const weekDocs = s.docs.filter((d) => d.weekId === doc.weekId).sort((a, b) => a.order - b.order)
      const pos = weekDocs.findIndex((d) => d.id === did)
      const t = pos + dir
      if (t < 0 || t >= weekDocs.length) return s
      const swapId = weekDocs[t].id
      const allDocs = [...s.docs]
      const i = allDocs.findIndex((d) => d.id === did)
      const j = allDocs.findIndex((d) => d.id === swapId)
      ;[allDocs[i], allDocs[j]] = [allDocs[j], allDocs[i]]
      // Recalculate order within this week
      const weekDocIds = weekDocs.map((d) => d.id)
      let wOrder = 0
      return { ...s, docs: allDocs.map((d) => weekDocIds.includes(d.id) ? { ...d, order: weekDocIds.indexOf(d.id) } : d) }
      void wOrder
    })
  }

  // ─── Question helpers ─────────────────────────────────────────────────────────

  function moveInGroup(docGroupId: string | null, globalIdx: number, dir: -1 | 1) {
    setQuestions((qs) => {
      const groupIdxs = qs.reduce<number[]>((a, q, i) => { if ((q.docGroupId ?? null) === docGroupId) a.push(i); return a }, [])
      const pos = groupIdxs.indexOf(globalIdx)
      const t = pos + dir
      if (t < 0 || t >= groupIdxs.length) return qs
      const next = [...qs]
      ;[next[globalIdx], next[groupIdxs[t]]] = [next[groupIdxs[t]], next[globalIdx]]
      return next.map((q, i) => ({ ...q, order: i }))
    })
  }
  function updateQuestion(i: number, patch: Partial<Question>) {
    setQuestions((qs) => qs.map((q, idx) => idx === i ? { ...q, ...patch } : q))
  }
  function updateOption(qi: number, oi: number, text: string) {
    setQuestions((qs) => qs.map((q, idx) => idx !== qi ? q : {
      ...q, options: q.options.map((o, j) => j === oi ? { ...o, text } : o)
    }))
  }
  function addQToDoc(docId: string | null, type: 'MCQ' | 'TEXT') {
    setQuestions((qs) => {
      const lastIdx = qs.reduce((last, q, i) => (q.docGroupId ?? null) === docId ? i : last, -1)
      const newQ = type === 'TEXT' ? makeTextQ(qs.length, docId) : makeQ(qs.length, docId)
      const next = [...qs]
      next.splice(lastIdx + 1, 0, newQ)
      return next.map((q, i) => ({ ...q, order: i }))
    })
  }

  // ─── Import ───────────────────────────────────────────────────────────────────

  function handleMcqFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' })
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]], { defval: '' })
      const parsed: Question[] = json.map((row, i) => {
        const get = (keys: string[]) => { const k = Object.keys(row).find((k) => keys.some((x) => k.toLowerCase().includes(x))); return k ? row[k]?.trim() ?? '' : '' }
        const opts = ['a', 'b', 'c', 'd'].map((l) => ({ id: crypto.randomUUID(), text: get([`option ${l}`, `opt ${l}`, l]) }))
        const cl = get(['correct', 'answer']).toUpperCase()
        const ci = ['A', 'B', 'C', 'D'].indexOf(cl)
        return { type: 'MCQ' as const, text: get(['question', 'q']), options: opts, correctId: ci >= 0 ? opts[ci].id : '', explanation: get(['explanation', 'explain', 'reason']), order: questions.length + i, docGroupId: null }
      }).filter((q) => q.text && q.correctId)
      setImportRows(parsed)
    }
    reader.readAsBinaryString(file)
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct (A/B/C/D)', 'Explanation'],
      ['What does CPD stand for?', 'Continuous Professional Development', 'Career Planning Document', 'Central Pedagogy Design', 'Collaborative Practice Drive', 'A', 'CPD = Continuous Professional Development'],
    ])
    ws['!cols'] = [40, 30, 30, 30, 30, 20, 40].map((w) => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Questions')
    XLSX.writeFile(wb, 'rysen_mcq_template.xlsx')
  }

  function confirmImport() {
    setQuestions((qs) => {
      const base = importMode === 'replace' ? [] : qs
      return [...base, ...importRows.map((q, i) => ({ ...q, docGroupId: null, order: base.length + i }))]
    })
    setImportRows([])
    setShowImport(false)
    if (importFileRef.current) importFileRef.current.value = ''
    setToast({ msg: `${importRows.length} questions imported (ungrouped)`, type: 'success' })
  }

  // ─── Render question card ─────────────────────────────────────────────────────

  function renderQCard(q: Question, gi: number, firstInGroup: boolean, lastInGroup: boolean) {
    const incomplete = !q.text.trim() || (q.type === 'MCQ' && (!q.correctId || q.options.some((o) => !o.text.trim())))
    return (
      <div key={gi} className={`border rounded-xl p-4 bg-white ${incomplete ? 'border-amber-300' : q.type === 'TEXT' ? 'border-olive/40' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-midnight">Q{gi + 1}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${q.type === 'TEXT' ? 'bg-olive/20 text-olive' : 'bg-midnight/10 text-midnight'}`}>
              {q.type === 'TEXT' ? 'Text' : 'MCQ'}
            </span>
            {incomplete && <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Incomplete</span>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => moveInGroup(q.docGroupId, gi, -1)} disabled={firstInGroup} className="p-1 rounded hover:bg-gray-100 disabled:opacity-20 text-charcoal/50"><ChevronUp size={14} /></button>
            <button onClick={() => moveInGroup(q.docGroupId, gi, 1)} disabled={lastInGroup} className="p-1 rounded hover:bg-gray-100 disabled:opacity-20 text-charcoal/50"><ChevronDown size={14} /></button>
            <button onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== gi).map((q, i) => ({ ...q, order: i })))} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
          </div>
        </div>
        <textarea placeholder={q.type === 'TEXT' ? 'Reflective / open-ended question...' : 'MCQ question...'} value={q.text}
          onChange={(e) => updateQuestion(gi, { text: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-midnight mb-3" rows={2} />
        {q.type === 'MCQ' && (
          <div className="flex flex-col gap-2 mb-3">
            {q.options.map((opt, oi) => (
              <div key={opt.id} className="flex items-center gap-2">
                <input type="radio" name={`correct-${gi}`} checked={q.correctId === opt.id} onChange={() => updateQuestion(gi, { correctId: opt.id })} className="accent-forest flex-shrink-0" />
                <input placeholder={`Option ${String.fromCharCode(65 + oi)}`} value={opt.text} onChange={(e) => updateOption(gi, oi, e.target.value)}
                  className={`flex-1 px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-midnight ${q.correctId === opt.id ? 'border-forest bg-forest/5' : 'border-gray-200'}`} />
              </div>
            ))}
          </div>
        )}
        {q.type === 'TEXT' && <p className="text-xs text-olive/70 italic mb-3">Free-text response — not scored, required to submit.</p>}
        <input placeholder={q.type === 'TEXT' ? 'Guidance note (optional)' : 'Explanation (shown after answer)'} value={q.explanation}
          onChange={(e) => updateQuestion(gi, { explanation: e.target.value })}
          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-midnight" />
      </div>
    )
  }

  // ─── Render doc group ─────────────────────────────────────────────────────────

  function renderDocGroup(doc: StageDoc, docsInWeek: StageDoc[]) {
    const isVideo = doc.type === 'video'
    const docPos = docsInWeek.findIndex((d) => d.id === doc.id)
    const groupQs = questions.map((q, gi) => ({ q, gi })).filter(({ q }) => q.docGroupId === doc.id)
    const borderColor = isVideo ? 'border-forest/25' : 'border-gold/25'
    const bgColor = isVideo ? 'bg-forest/8' : 'bg-gold/10'
    const borderB = isVideo ? 'border-forest/20' : 'border-gold/20'
    return (
      <div key={doc.id} className={`border-2 ${borderColor} rounded-xl overflow-hidden`}>
        <div className={`${bgColor} border-b ${borderB} px-3 py-2.5 flex items-center gap-2`}>
          <div className="flex flex-col gap-0.5 flex-shrink-0">
            <button onClick={() => moveDocInWeek(doc.id, -1)} disabled={docPos === 0} className="p-0.5 text-charcoal/30 hover:text-midnight disabled:opacity-20"><ChevronUp size={12} /></button>
            <button onClick={() => moveDocInWeek(doc.id, 1)} disabled={docPos === docsInWeek.length - 1} className="p-0.5 text-charcoal/30 hover:text-midnight disabled:opacity-20"><ChevronDown size={12} /></button>
          </div>
          {isVideo
            ? <Video size={13} className="text-forest flex-shrink-0" />
            : <LinkIcon size={13} className="text-charcoal/40 flex-shrink-0" />}
          <input placeholder={isVideo ? 'Video title' : 'Document title'} value={doc.title} onChange={(e) => updateDoc(doc.id, { title: e.target.value })}
            className="w-36 bg-transparent text-sm font-semibold focus:outline-none text-midnight min-w-0 border-b border-transparent focus:border-gold/50" />
          <input
            placeholder={isVideo ? 'YouTube URL or direct video URL (MP4)' : 'https://docs.google.com/...'}
            value={doc.url} onChange={(e) => updateDoc(doc.id, { url: e.target.value })}
            className="flex-1 bg-transparent text-xs focus:outline-none text-charcoal/60 min-w-0 border-b border-transparent focus:border-gold/50" />
          <button onClick={() => removeDoc(doc.id)} className="text-red-400 hover:text-red-600 flex-shrink-0 ml-1"><Trash2 size={12} /></button>
        </div>
        <div className="p-3 bg-cream/10 flex flex-col gap-2">
          {groupQs.length === 0 && <p className="text-xs text-charcoal/30 italic text-center py-1">No questions — add below</p>}
          {groupQs.map(({ q, gi }, gqi) => renderQCard(q, gi, gqi === 0, gqi === groupQs.length - 1))}
          <div className="flex gap-2 pt-1">
            <button onClick={() => addQToDoc(doc.id, 'MCQ')} className="flex items-center gap-1 text-xs text-midnight bg-white hover:bg-gold/10 border border-gold/30 px-2.5 py-1.5 rounded-lg font-medium transition-colors">
              <Plus size={11} /> MCQ
            </button>
            <button onClick={() => addQToDoc(doc.id, 'TEXT')} className="flex items-center gap-1 text-xs text-olive bg-white hover:bg-olive/10 border border-olive/30 px-2.5 py-1.5 rounded-lg font-medium transition-colors">
              <Plus size={11} /> Text Q
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Main render ──────────────────────────────────────────────────────────────

  if (!stage) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" /></div>

  const weeks = (stage.weeks ?? []).sort((a, b) => a.order - b.order)
  const ungroupedDocs = stage.docs.filter((d) => !d.weekId || !weeks.find((w) => w.id === d.weekId))
  const ungroupedQs = questions.map((q, gi) => ({ q, gi })).filter(({ q }) => !q.docGroupId || !stage.docs.find((d) => d.id === q.docGroupId))

  return (
    <div className="max-w-3xl mx-auto">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-charcoal/60 hover:text-midnight mb-6">
        <ArrowLeft size={16} /> Back to Stages
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-midnight">Stage {stage.number}: {stage.title}</h1>
        <p className="text-sm text-charcoal/60">{stage.week}</p>
      </div>

      {/* Stage Settings */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="font-bold text-midnight mb-4">Stage Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Stage Title" placeholder="e.g. Foundations of Teaching" value={stage.title ?? ''}
            onChange={(e) => setStage((s) => s ? { ...s, title: e.target.value } : s)} />
          <Input label="Subtitle" placeholder="e.g. Core pedagogy concepts" value={stage.subtitle ?? ''}
            onChange={(e) => setStage((s) => s ? { ...s, subtitle: e.target.value } : s)} />
          <div className="md:col-span-2">
            <Input label="Period Label" placeholder="e.g. Weeks 1–4" value={stage.week ?? ''}
              onChange={(e) => setStage((s) => s ? { ...s, week: e.target.value } : s)} />
          </div>
          <div className="md:col-span-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-charcoal">Applicable To</label>
              <select value={stage.applicableTo} onChange={(e) => setStage((s) => s ? { ...s, applicableTo: e.target.value } : s)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-midnight text-sm">
                <option value="BOTH">Both Educators & Principals</option>
                <option value="EDUCATOR">Educators Only</option>
                <option value="PRINCIPAL">Principals / Center Heads Only</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-charcoal">Time Limit (minutes)</label>
            <input type="number" min={5} max={120} value={stage.timeLimitMinutes}
              onChange={(e) => setStage((s) => s ? { ...s, timeLimitMinutes: +e.target.value } : s)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-midnight" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-charcoal">Pass Score (%)</label>
            <input type="number" min={50} max={100} value={stage.passScore}
              onChange={(e) => setStage((s) => s ? { ...s, passScore: +e.target.value } : s)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-midnight" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-charcoal">Max Attempts</label>
            <input type="number" min={1} max={10} value={stage.maxAttempts}
              onChange={(e) => setStage((s) => s ? { ...s, maxAttempts: +e.target.value } : s)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-midnight" />
          </div>
          <Input label="Badge Title" placeholder="e.g. RYSEN Pioneer" value={stage.badgeTitle ?? ''}
            onChange={(e) => setStage((s) => s ? { ...s, badgeTitle: e.target.value } : s)} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-charcoal">Badge Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={stage.badgeColor} onChange={(e) => setStage((s) => s ? { ...s, badgeColor: e.target.value } : s)}
                className="w-10 h-10 rounded cursor-pointer border border-gray-300" />
              <span className="text-sm text-charcoal/60">{stage.badgeColor}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={stage.isPublished}
              onChange={(e) => setStage((s) => s ? { ...s, isPublished: e.target.checked } : s)}
              className="w-4 h-4 accent-midnight" />
            <span className="text-sm font-medium text-charcoal">Published (visible to educators)</span>
          </label>
          <Button onClick={saveSettings} loading={saving} size="sm"><Save size={14} /> Save Settings</Button>
        </div>
      </div>

      {/* Training Content */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-midnight">Training Content</h2>
            <p className="text-xs text-charcoal/50">
              {weeks.length} week{weeks.length !== 1 ? 's' : ''} · {stage.docs.length} links · {questions.filter((q) => q.type === 'MCQ').length} MCQ · {questions.filter((q) => q.type === 'TEXT').length} Text
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setShowImport(true)}>
            <FileSpreadsheet size={14} /> Import MCQ
          </Button>
        </div>

        <div className="flex flex-col gap-4">

          {/* Week groups */}
          {weeks.map((week, wi) => {
            const weekDocs = stage.docs.filter((d) => d.weekId === week.id).sort((a, b) => a.order - b.order)
            return (
              <div key={week.id} className="border-2 border-midnight/15 rounded-2xl overflow-hidden">
                {/* Week header */}
                <div className="bg-midnight/5 border-b border-midnight/10 px-4 py-3 flex items-center gap-2">
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button onClick={() => moveWeek(wi, -1)} disabled={wi === 0} className="p-0.5 text-charcoal/30 hover:text-midnight disabled:opacity-20"><ChevronUp size={13} /></button>
                    <button onClick={() => moveWeek(wi, 1)} disabled={wi === weeks.length - 1} className="p-0.5 text-charcoal/30 hover:text-midnight disabled:opacity-20"><ChevronDown size={13} /></button>
                  </div>
                  <BookOpen size={15} className="text-midnight flex-shrink-0" />
                  <input value={week.label} onChange={(e) => updateWeekLabel(week.id, e.target.value)}
                    className="flex-1 bg-transparent text-sm font-bold text-midnight focus:outline-none border-b border-transparent focus:border-midnight/30 min-w-0" />
                  <span className="text-xs text-charcoal/40">{weekDocs.length} link{weekDocs.length !== 1 ? 's' : ''}</span>
                  <button onClick={() => removeWeek(week.id)} className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0"><Trash2 size={13} /></button>
                </div>

                {/* Docs in this week */}
                <div className="p-3 flex flex-col gap-3">
                  {weekDocs.length === 0 && <p className="text-xs text-charcoal/30 italic text-center py-1">No links yet — add below</p>}
                  {weekDocs.map((doc) => renderDocGroup(doc, weekDocs))}
                  <div className="flex gap-2">
                    <button onClick={() => addDoc(week.id, 'doc')}
                      className="flex items-center gap-1.5 text-xs text-midnight bg-cream hover:bg-gold/20 border border-dashed border-gold/40 px-3 py-2 rounded-xl font-medium transition-colors flex-1 justify-center">
                      <LinkIcon size={12} /> Add Link
                    </button>
                    <button onClick={() => addDoc(week.id, 'video')}
                      className="flex items-center gap-1.5 text-xs text-forest bg-cream hover:bg-forest/10 border border-dashed border-forest/30 px-3 py-2 rounded-xl font-medium transition-colors flex-1 justify-center">
                      <Video size={12} /> Add Video
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Ungrouped docs (no week) */}
          {(ungroupedDocs.length > 0) && (
            <div className="border-2 border-dashed border-charcoal/15 rounded-2xl overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5">
                <span className="text-xs font-semibold text-charcoal/40 uppercase tracking-wide">Links without a Week</span>
              </div>
              <div className="p-3 flex flex-col gap-3">
                {ungroupedDocs.map((doc) => renderDocGroup(doc, ungroupedDocs))}
              </div>
            </div>
          )}

          {/* Ungrouped questions (no doc) */}
          {(ungroupedQs.length > 0 || (weeks.length === 0 && stage.docs.length === 0)) && (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-charcoal/40 uppercase tracking-wide">Questions without a Link</span>
                <span className="text-xs text-charcoal/30">{ungroupedQs.length}</span>
              </div>
              <div className="p-3 flex flex-col gap-3">
                {ungroupedQs.length === 0 && <p className="text-xs text-charcoal/30 italic text-center py-1">Add questions below</p>}
                {ungroupedQs.map(({ q, gi }, gqi) => renderQCard(q, gi, gqi === 0, gqi === ungroupedQs.length - 1))}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => addQToDoc(null, 'MCQ')} className="flex items-center gap-1 text-xs text-midnight bg-white hover:bg-gold/10 border border-gold/30 px-2.5 py-1.5 rounded-lg font-medium transition-colors">
                    <Plus size={11} /> MCQ
                  </button>
                  <button onClick={() => addQToDoc(null, 'TEXT')} className="flex items-center gap-1 text-xs text-olive bg-white hover:bg-olive/10 border border-olive/30 px-2.5 py-1.5 rounded-lg font-medium transition-colors">
                    <Plus size={11} /> Text Q
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add week button */}
          <button onClick={addWeek}
            className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-midnight/20 rounded-2xl text-sm font-semibold text-midnight hover:bg-midnight/5 hover:border-midnight/40 transition-colors">
            <Plus size={16} /> Add Week
          </button>
        </div>

        <Button onClick={saveContent} loading={saving} className="mt-5 w-full">
          <Save size={16} /> Save Content
        </Button>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-midnight">Import MCQ Questions</h2>
              <button onClick={() => { setShowImport(false); setImportRows([]) }}><X size={20} className="text-charcoal/60" /></button>
            </div>
            <div className="bg-cream rounded-xl p-4 mb-4 text-sm text-charcoal/70">
              Upload CSV or Excel: <strong>Question, Option A–D, Correct (A/B/C/D), Explanation</strong>. Imported questions land in "Questions without a Link" — assign them to a link after import.
            </div>
            <button onClick={downloadTemplate} className="flex items-center gap-2 text-sm text-forest font-medium hover:underline mb-4">
              <Download size={14} /> Download template
            </button>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-midnight transition-colors mb-4">
              <Upload size={24} className="text-charcoal/30 mb-2" />
              <span className="text-sm font-medium text-midnight">Click to upload CSV or Excel</span>
              <span className="text-xs text-charcoal/40 mt-1">.csv, .xlsx, .xls</span>
              <input ref={importFileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleMcqFileUpload} className="hidden" />
            </label>
            {importRows.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-midnight">{importRows.length} questions ready</span>
                  <button onClick={() => { setImportRows([]); if (importFileRef.current) importFileRef.current.value = '' }} className="text-xs text-red-500 hover:underline">Clear</button>
                </div>
                <div className="max-h-36 overflow-y-auto border border-gray-100 rounded-xl mb-3">
                  <table className="w-full text-xs">
                    <thead className="bg-cream sticky top-0"><tr>
                      <th className="text-left px-3 py-2">#</th>
                      <th className="text-left px-3 py-2">Question</th>
                      <th className="text-left px-3 py-2">Correct</th>
                    </tr></thead>
                    <tbody>
                      {importRows.map((q, i) => (
                        <tr key={i} className="border-t border-gray-50">
                          <td className="px-3 py-1.5 text-charcoal/40">{i + 1}</td>
                          <td className="px-3 py-1.5 truncate max-w-xs">{q.text}</td>
                          <td className="px-3 py-1.5 text-forest font-medium">{['A', 'B', 'C', 'D'][q.options.findIndex((o) => o.id === q.correctId)]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="im" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} className="accent-midnight" />
                    Add to existing
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="im" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} className="accent-red-500" />
                    <span className="text-red-600">Replace all</span>
                  </label>
                </div>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <Button variant="ghost" onClick={() => { setShowImport(false); setImportRows([]) }} className="flex-1">Cancel</Button>
              <Button onClick={confirmImport} disabled={!importRows.length} className="flex-1">
                <Upload size={16} /> Import {importRows.length > 0 ? `${importRows.length}` : ''}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
