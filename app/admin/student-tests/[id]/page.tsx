'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, GripVertical, Image, Video, Eye, EyeOff, Save, ArrowLeft } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Link from 'next/link'

interface Option { id: string; text: string }
interface Question {
  id?: string; type: string; text: string
  imageUrl: string | null; videoUrl: string | null
  options: Option[]; correctId: string; explanation: string | null
  order: number; marks: number
}
interface TestMeta {
  id: string; title: string; description: string | null
  subject: string; targetClass: string; timeLimitMinutes: number
  passScore: number; isPublished: boolean
}

const Q_TYPES = ['MCQ', 'TEXT', 'IMAGE', 'VIDEO']

function newOption(): Option { return { id: crypto.randomUUID(), text: '' } }
function newQuestion(order: number): Question {
  return { type: 'MCQ', text: '', imageUrl: null, videoUrl: null, options: [newOption(), newOption(), newOption(), newOption()], correctId: '', explanation: null, order, marks: 1 }
}

export default function StudentTestEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [test, setTest] = useState<TestMeta | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [meta, setMeta] = useState<Partial<TestMeta>>({})

  useEffect(() => {
    async function load() {
      const [t, q] = await Promise.all([
        fetch(`/api/student-tests/${id}`).then((r) => r.json()),
        fetch(`/api/student-tests/${id}/questions`).then((r) => r.json()),
      ])
      setTest(t)
      setMeta({ title: t.title, description: t.description, subject: t.subject, targetClass: t.targetClass, timeLimitMinutes: t.timeLimitMinutes, passScore: t.passScore, isPublished: t.isPublished })
      setQuestions(Array.isArray(q) ? q : [])
      setLoading(false)
    }
    load()
  }, [id])

  function addQuestion() {
    setQuestions((prev) => [...prev, newQuestion(prev.length)])
  }

  function removeQuestion(idx: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order: i })))
  }

  function updateQ(idx: number, patch: Partial<Question>) {
    setQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, ...patch } : q))
  }

  function updateOption(qIdx: number, optIdx: number, text: string) {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx) return q
      const opts = q.options.map((o, j) => j === optIdx ? { ...o, text } : o)
      return { ...q, options: opts }
    }))
  }

  function addOption(qIdx: number) {
    setQuestions((prev) => prev.map((q, i) => i === qIdx ? { ...q, options: [...q.options, newOption()] } : q))
  }

  function removeOption(qIdx: number, optIdx: number) {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx) return q
      const opts = q.options.filter((_, j) => j !== optIdx)
      const correctId = q.correctId === q.options[optIdx]?.id ? '' : q.correctId
      return { ...q, options: opts, correctId }
    }))
  }

  async function save() {
    setSaving(true)
    await Promise.all([
      fetch(`/api/student-tests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meta),
      }),
      fetch(`/api/student-tests/${id}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questions.map((q, i) => ({ ...q, order: i }))),
      }),
    ])
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function togglePublish() {
    const next = !meta.isPublished
    await fetch(`/api/student-tests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: next }),
    })
    setMeta((m) => ({ ...m, isPublished: next }))
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/student-tests">
            <button className="p-2 rounded-xl hover:bg-gray-100 text-charcoal/60 transition-colors"><ArrowLeft size={18} /></button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-midnight">{test?.title}</h1>
            <p className="text-xs text-charcoal/50">{questions.length} questions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={togglePublish}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${meta.isPublished ? 'bg-forest/10 text-forest hover:bg-forest/20' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
            {meta.isPublished ? <><EyeOff size={13} /> Unpublish</> : <><Eye size={13} /> Publish</>}
          </button>
          <Button onClick={save} loading={saving} size="sm" className="flex items-center gap-1.5">
            <Save size={14} /> {saved ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Test Meta */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <h2 className="text-sm font-bold text-midnight mb-3">Test Settings</h2>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Title" value={meta.title ?? ''} onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))} />
          <Input label="Subject" value={meta.subject ?? ''} onChange={(e) => setMeta((m) => ({ ...m, subject: e.target.value }))} />
          <Input label="Target Class" value={meta.targetClass ?? ''} onChange={(e) => setMeta((m) => ({ ...m, targetClass: e.target.value }))} />
          <Input label="Description" value={meta.description ?? ''} onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-charcoal">Time Limit (min)</label>
            <input type="number" min="5" value={meta.timeLimitMinutes ?? 30}
              onChange={(e) => setMeta((m) => ({ ...m, timeLimitMinutes: parseInt(e.target.value) }))}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-charcoal">Pass Score (%)</label>
            <input type="number" min="0" max="100" value={meta.passScore ?? 60}
              onChange={(e) => setMeta((m) => ({ ...m, passScore: parseInt(e.target.value) }))}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight" />
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="flex flex-col gap-4 mb-6">
        {questions.map((q, qIdx) => (
          <div key={qIdx} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GripVertical size={16} className="text-charcoal/30 cursor-grab" />
                <span className="text-xs font-bold text-midnight bg-midnight/5 px-2.5 py-1 rounded-lg">Q{qIdx + 1}</span>
                <select value={q.type} onChange={(e) => updateQ(qIdx, { type: e.target.value, options: e.target.value === 'MCQ' ? (q.options.length >= 2 ? q.options : [newOption(), newOption()]) : [] })}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-charcoal focus:outline-none focus:ring-1 focus:ring-midnight">
                  {Q_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="flex items-center gap-1">
                  <label className="text-xs text-charcoal/50">Marks</label>
                  <input type="number" min="1" max="10" value={q.marks}
                    onChange={(e) => updateQ(qIdx, { marks: parseInt(e.target.value) || 1 })}
                    className="w-14 text-xs border border-gray-200 rounded-lg px-2 py-1 text-charcoal focus:outline-none focus:ring-1 focus:ring-midnight" />
                </div>
              </div>
              <button onClick={() => removeQuestion(qIdx)} className="p-1.5 rounded-lg hover:bg-red-50 text-charcoal/30 hover:text-red-500 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>

            <textarea
              value={q.text}
              onChange={(e) => updateQ(qIdx, { text: e.target.value })}
              placeholder="Question text…"
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight resize-none mb-3"
            />

            {(q.type === 'IMAGE' || q.type === 'MCQ') && (
              <div className="flex items-center gap-2 mb-3">
                <Image size={14} className="text-charcoal/40 flex-shrink-0" />
                <input
                  value={q.imageUrl ?? ''}
                  onChange={(e) => updateQ(qIdx, { imageUrl: e.target.value || null })}
                  placeholder="Image URL (optional)"
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-midnight"
                />
              </div>
            )}

            {(q.type === 'VIDEO' || q.type === 'MCQ') && (
              <div className="flex items-center gap-2 mb-3">
                <Video size={14} className="text-charcoal/40 flex-shrink-0" />
                <input
                  value={q.videoUrl ?? ''}
                  onChange={(e) => updateQ(qIdx, { videoUrl: e.target.value || null })}
                  placeholder="Video URL (YouTube or MP4)"
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-midnight"
                />
              </div>
            )}

            {q.type === 'MCQ' && (
              <div className="flex flex-col gap-2 mb-3">
                <p className="text-xs font-semibold text-charcoal/60">Options (click circle to mark correct)</p>
                {q.options.map((opt, optIdx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQ(qIdx, { correctId: opt.id })}
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${q.correctId === opt.id ? 'border-forest bg-forest' : 'border-gray-300'}`}
                    />
                    <input
                      value={opt.text}
                      onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                      placeholder={`Option ${optIdx + 1}`}
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-1 focus:ring-midnight"
                    />
                    {q.options.length > 2 && (
                      <button onClick={() => removeOption(qIdx, optIdx)} className="p-1 text-charcoal/30 hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => addOption(qIdx)} className="text-xs text-midnight/60 hover:text-midnight font-medium mt-1 self-start">
                  + Add option
                </button>
              </div>
            )}

            <input
              value={q.explanation ?? ''}
              onChange={(e) => updateQ(qIdx, { explanation: e.target.value || null })}
              placeholder="Explanation (shown after submit)"
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-charcoal/70 focus:outline-none focus:ring-1 focus:ring-midnight"
            />
          </div>
        ))}
      </div>

      <button onClick={addQuestion}
        className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-midnight/20 rounded-2xl text-sm text-midnight/60 hover:border-midnight/40 hover:text-midnight transition-colors">
        <Plus size={18} /> Add Question
      </button>
    </div>
  )
}
