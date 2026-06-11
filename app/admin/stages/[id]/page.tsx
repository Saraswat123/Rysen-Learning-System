'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Save, Upload, Download, X, FileSpreadsheet, ChevronUp, ChevronDown, Link as LinkIcon } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Toast from '@/components/Toast'
import * as XLSX from 'xlsx'

interface Option { id: string; text: string }
interface Question {
  id?: string; type: 'MCQ' | 'TEXT'; text: string; options: Option[]
  correctId: string; explanation: string; order: number
}
interface StageDoc { id: string; title: string; url: string; order: number }
interface Stage {
  id: string; number: number; title: string; subtitle: string
  description: string; week: string; docUrl: string
  docs: StageDoc[]; applicableTo: string
  timeLimitMinutes: number; passScore: number; maxAttempts: number
  badgeTitle: string; badgeColor: string; isPublished: boolean
  questions: Question[]
}

function makeOption(): Option { return { id: crypto.randomUUID(), text: '' } }
function makeQuestion(order: number): Question {
  return { type: 'MCQ', text: '', options: [makeOption(), makeOption(), makeOption(), makeOption()], correctId: '', explanation: '', order }
}
function makeTextQuestion(order: number): Question {
  return { type: 'TEXT', text: '', options: [], correctId: '', explanation: '', order }
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
      setStage({ ...data, docs: data.docs ?? [], applicableTo: data.applicableTo ?? 'BOTH' })
      setQuestions(data.questions?.length ? data.questions : [makeQuestion(0)])
    })
  }, [id])

  async function saveStage() {
    if (!stage) return
    setSaving(true)
    const res = await fetch(`/api/stages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        docUrl: stage.docUrl,
        docs: stage.docs,
        applicableTo: stage.applicableTo,
        timeLimitMinutes: stage.timeLimitMinutes,
        passScore: stage.passScore,
        maxAttempts: stage.maxAttempts,
        badgeTitle: stage.badgeTitle,
        badgeColor: stage.badgeColor,
        isPublished: stage.isPublished,
      }),
    })
    if (res.ok) setToast({ msg: 'Stage settings saved', type: 'success' })
    else setToast({ msg: 'Failed to save', type: 'error' })
    setSaving(false)
  }

  async function saveQuestions() {
    const valid = questions.filter((q) =>
      q.text.trim() && (
        q.type === 'TEXT' ||
        (q.correctId && q.options.every((o) => o.text.trim()))
      )
    )
    const skipped = questions.length - valid.length

    if (valid.length === 0) {
      setToast({ msg: 'No complete questions to save. Fill question text, all 4 options, and select correct answer.', type: 'error' })
      return
    }

    setSaving(true)
    const res = await fetch(`/api/stages/${id}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(valid),
    })

    if (res.ok) {
      // Reload from server so local state has proper DB IDs
      const refreshed = await fetch(`/api/stages/${id}/questions`).then((r) => r.json())
      setQuestions(refreshed)
      const msg = skipped > 0
        ? `${valid.length} questions saved. ${skipped} skipped (incomplete).`
        : `${valid.length} questions saved`
      setToast({ msg, type: skipped > 0 ? 'error' : 'success' })
    } else {
      setToast({ msg: 'Failed to save questions', type: 'error' })
    }
    setSaving(false)
  }

  function updateQuestion(i: number, patch: Partial<Question>) {
    setQuestions((qs) => qs.map((q, idx) => idx === i ? { ...q, ...patch } : q))
  }

  function updateOption(qi: number, oi: number, text: string) {
    setQuestions((qs) => qs.map((q, idx) => idx !== qi ? q : {
      ...q, options: q.options.map((o, j) => j === oi ? { ...o, text } : o)
    }))
  }

  function moveQuestion(qi: number, dir: -1 | 1) {
    setQuestions((qs) => {
      const next = [...qs]
      const target = qi + dir
      if (target < 0 || target >= next.length) return qs
      ;[next[qi], next[target]] = [next[target], next[qi]]
      return next.map((q, i) => ({ ...q, order: i }))
    })
  }

  function addDoc() {
    setStage((s) => s ? { ...s, docs: [...(s.docs ?? []), { id: crypto.randomUUID(), title: '', url: '', order: (s.docs ?? []).length }] } : s)
  }
  function updateDoc(i: number, patch: Partial<StageDoc>) {
    setStage((s) => s ? { ...s, docs: s.docs.map((d, idx) => idx === i ? { ...d, ...patch } : d) } : s)
  }
  function removeDoc(i: number) {
    setStage((s) => s ? { ...s, docs: s.docs.filter((_, idx) => idx !== i) } : s)
  }
  function moveDoc(i: number, dir: -1 | 1) {
    setStage((s) => {
      if (!s) return s
      const next = [...s.docs]
      const target = i + dir
      if (target < 0 || target >= next.length) return s
      ;[next[i], next[target]] = [next[target], next[i]]
      return { ...s, docs: next.map((d, idx) => ({ ...d, order: idx })) }
    })
  }

  function handleMcqFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = ev.target?.result
      const wb = XLSX.read(data, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })

      const parsed: Question[] = json.map((row, i) => {
        const get = (keys: string[]) => {
          const k = Object.keys(row).find((k) => keys.some((x) => k.toLowerCase().includes(x)))
          return k ? row[k]?.trim() ?? '' : ''
        }
        const opts: Option[] = [
          { id: crypto.randomUUID(), text: get(['option a', 'opt a', 'a']) },
          { id: crypto.randomUUID(), text: get(['option b', 'opt b', 'b']) },
          { id: crypto.randomUUID(), text: get(['option c', 'opt c', 'c']) },
          { id: crypto.randomUUID(), text: get(['option d', 'opt d', 'd']) },
        ]
        const correctLetter = get(['correct', 'answer']).toUpperCase()
        const correctIdx = ['A', 'B', 'C', 'D'].indexOf(correctLetter)
        const correctId = correctIdx >= 0 ? opts[correctIdx].id : ''
        return {
          type: 'MCQ' as const,
          text: get(['question', 'q']),
          options: opts,
          correctId,
          explanation: get(['explanation', 'explain', 'reason']),
          order: questions.length + i,
        }
      }).filter((q) => q.text && q.correctId)

      setImportRows(parsed)
    }
    reader.readAsBinaryString(file)
  }

  function downloadMcqTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct (A/B/C/D)', 'Explanation'],
      ['What does CPD stand for?', 'Continuous Professional Development', 'Career Planning Document', 'Central Pedagogy Design', 'Collaborative Practice Drive', 'A', 'CPD means Continuous Professional Development'],
      ['Which teaching method is student-centred?', 'Lecture', 'Rote learning', 'Inquiry-based learning', 'Direct instruction', 'C', 'Inquiry-based learning puts students at the centre'],
    ])
    ws['!cols'] = [{ wch: 40 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 40 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Questions')
    XLSX.writeFile(wb, 'rysen_mcq_template.xlsx')
  }

  function confirmImport() {
    setQuestions((qs) => {
      const base = importMode === 'replace' ? [] : qs
      const merged = [...base, ...importRows.map((q, i) => ({ ...q, order: base.length + i }))]
      return merged
    })
    setImportRows([])
    setShowImport(false)
    if (importFileRef.current) importFileRef.current.value = ''
    setToast({ msg: `${importRows.length} questions imported`, type: 'success' })
  }

  if (!stage) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" /></div>

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
        {/* Multiple Training Documents */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-charcoal">Training Documents</label>
            <button onClick={addDoc} className="flex items-center gap-1.5 text-xs text-midnight bg-cream hover:bg-gold/20 px-3 py-1.5 rounded-lg font-medium transition-colors">
              <Plus size={12} /> Add Link
            </button>
          </div>
          {(stage.docs ?? []).length === 0 && (
            <p className="text-xs text-charcoal/40 italic">No documents added. Click "Add Link" to add training materials.</p>
          )}
          <div className="flex flex-col gap-2">
            {(stage.docs ?? []).map((doc, di) => (
              <div key={doc.id} className="flex items-center gap-2 bg-cream/50 border border-gray-100 rounded-xl p-3">
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button onClick={() => moveDoc(di, -1)} disabled={di === 0}
                    className="p-0.5 text-charcoal/30 hover:text-midnight disabled:opacity-20 disabled:cursor-not-allowed">
                    <ChevronUp size={13} />
                  </button>
                  <button onClick={() => moveDoc(di, 1)} disabled={di === (stage.docs ?? []).length - 1}
                    className="p-0.5 text-charcoal/30 hover:text-midnight disabled:opacity-20 disabled:cursor-not-allowed">
                    <ChevronDown size={13} />
                  </button>
                </div>
                <span className="text-xs font-bold text-charcoal/30 w-4 flex-shrink-0">{di + 1}</span>
                <LinkIcon size={14} className="text-charcoal/40 flex-shrink-0" />
                <input placeholder="Document title (e.g. Week 1 - Day 1 Reading)"
                  value={doc.title} onChange={(e) => updateDoc(di, { title: e.target.value })}
                  className="flex-1 bg-transparent text-sm focus:outline-none text-charcoal min-w-0" />
                <input placeholder="https://docs.google.com/..."
                  value={doc.url} onChange={(e) => updateDoc(di, { url: e.target.value })}
                  className="flex-1 bg-transparent text-sm focus:outline-none text-charcoal/70 min-w-0" />
                <button onClick={() => removeDoc(di)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-charcoal">Applicable To</label>
              <select value={stage.applicableTo}
                onChange={(e) => setStage((s) => s ? { ...s, applicableTo: e.target.value } : s)}
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
          <Input label="Badge Title" placeholder="e.g. RYSEN Pioneer"
            value={stage.badgeTitle ?? ''}
            onChange={(e) => setStage((s) => s ? { ...s, badgeTitle: e.target.value } : s)} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-charcoal">Badge Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={stage.badgeColor}
                onChange={(e) => setStage((s) => s ? { ...s, badgeColor: e.target.value } : s)}
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
          <Button onClick={saveStage} loading={saving} size="sm"><Save size={14} /> Save Settings</Button>
        </div>
      </div>

      {/* MCQ Builder */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-midnight">Questions ({questions.length})</h2>
            <p className="text-xs text-charcoal/50">
              {questions.filter((q) => q.type === 'MCQ').length} MCQ · {questions.filter((q) => q.type === 'TEXT').length} Text
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowImport(true)}>
              <FileSpreadsheet size={14} /> Import
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setQuestions((qs) => [...qs, makeTextQuestion(qs.length)])}>
              <Plus size={14} /> Text Q
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setQuestions((qs) => [...qs, makeQuestion(qs.length)])}>
              <Plus size={14} /> MCQ
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {questions.map((q, qi) => {
            const incomplete = !q.text.trim() || (q.type === 'MCQ' && (!q.correctId || q.options.some((o) => !o.text.trim())))
            return (
            <div key={qi} className={`border rounded-xl p-4 ${incomplete ? 'border-amber-300 bg-amber-50/40' : q.type === 'TEXT' ? 'border-olive/40 bg-olive/5' : 'border-gray-100 bg-cream/30'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-midnight">Q{qi + 1}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${q.type === 'TEXT' ? 'bg-olive/20 text-olive' : 'bg-midnight/10 text-midnight'}`}>
                    {q.type === 'TEXT' ? 'Text' : 'MCQ'}
                  </span>
                  {incomplete && <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Incomplete</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveQuestion(qi, -1)} disabled={qi === 0}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-20 text-charcoal/50">
                    <ChevronUp size={14} />
                  </button>
                  <button onClick={() => moveQuestion(qi, 1)} disabled={qi === questions.length - 1}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-20 text-charcoal/50">
                    <ChevronDown size={14} />
                  </button>
                  <button onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))}
                    className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                </div>
              </div>

              <textarea
                placeholder={q.type === 'TEXT' ? 'Enter reflective/open-ended question...' : 'Enter MCQ question...'}
                value={q.text}
                onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-midnight mb-3"
                rows={2}
              />

              {q.type === 'MCQ' && (
                <div className="flex flex-col gap-2 mb-3">
                  {q.options.map((opt, oi) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input type="radio" name={`correct-${qi}`} checked={q.correctId === opt.id}
                        onChange={() => updateQuestion(qi, { correctId: opt.id })}
                        className="accent-forest flex-shrink-0" />
                      <input
                        placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                        value={opt.text}
                        onChange={(e) => updateOption(qi, oi, e.target.value)}
                        className={`flex-1 px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-midnight ${q.correctId === opt.id ? 'border-forest bg-forest/5' : 'border-gray-200'}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {q.type === 'TEXT' && (
                <p className="text-xs text-olive/70 italic mb-3">Educator will type a free-text response. Not scored — required to submit.</p>
              )}

              <input
                placeholder={q.type === 'TEXT' ? 'Guidance note (optional)' : 'Explanation (shown after answer)'}
                value={q.explanation}
                onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-midnight"
              />
            </div>
          )
          })}
        </div>

        <Button onClick={saveQuestions} loading={saving} className="mt-5 w-full">
          <Save size={16} /> Save All Questions
        </Button>
      </div>

      {/* Bulk MCQ Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-midnight">Import MCQ Questions</h2>
              <button onClick={() => { setShowImport(false); setImportRows([]) }}><X size={20} className="text-charcoal/60" /></button>
            </div>

            <div className="bg-cream rounded-xl p-4 mb-4 text-sm text-charcoal/70">
              Upload CSV or Excel with columns: <strong>Question</strong>, <strong>Option A</strong>, <strong>Option B</strong>, <strong>Option C</strong>, <strong>Option D</strong>, <strong>Correct (A/B/C/D)</strong>, <strong>Explanation</strong>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <button onClick={downloadMcqTemplate} className="flex items-center gap-2 text-sm text-forest font-medium hover:underline">
                <Download size={14} /> Download template
              </button>
            </div>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-midnight transition-colors mb-4">
              <Upload size={24} className="text-charcoal/30 mb-2" />
              <span className="text-sm font-medium text-midnight">Click to upload CSV or Excel</span>
              <span className="text-xs text-charcoal/40 mt-1">.csv, .xlsx, .xls supported</span>
              <input ref={importFileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleMcqFileUpload} className="hidden" />
            </label>

            {importRows.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-midnight">{importRows.length} questions ready</span>
                  <button onClick={() => { setImportRows([]); if (importFileRef.current) importFileRef.current.value = '' }}
                    className="text-xs text-red-500 hover:underline">Clear</button>
                </div>
                <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-xl mb-4">
                  <table className="w-full text-xs">
                    <thead className="bg-cream sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-charcoal">#</th>
                        <th className="text-left px-3 py-2 font-semibold text-charcoal">Question</th>
                        <th className="text-left px-3 py-2 font-semibold text-charcoal">Correct</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((q, i) => (
                        <tr key={i} className="border-t border-gray-50">
                          <td className="px-3 py-1.5 text-charcoal/40">{i + 1}</td>
                          <td className="px-3 py-1.5 text-charcoal truncate max-w-xs">{q.text}</td>
                          <td className="px-3 py-1.5 text-forest font-medium">
                            {['A', 'B', 'C', 'D'][q.options.findIndex((o) => o.id === q.correctId)]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-4 text-sm mb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="importMode" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} className="accent-midnight" />
                    <span>Add to existing questions</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="importMode" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} className="accent-red-500" />
                    <span className="text-red-600">Replace all questions</span>
                  </label>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => { setShowImport(false); setImportRows([]) }} className="flex-1">Cancel</Button>
              <Button onClick={confirmImport} disabled={!importRows.length} className="flex-1">
                <Upload size={16} /> Import {importRows.length > 0 ? `${importRows.length} Questions` : ''}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
