'use client'

import { useState, useEffect, use, useRef } from 'react'
import { Plus, Trash2, GripVertical, ImageIcon, Video, Eye, EyeOff, Save, ArrowLeft, Upload, X, Link2 } from 'lucide-react'
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
const MAX_IMG_KB = 400

function newOption(): Option { return { id: crypto.randomUUID(), text: '' } }
function newQuestion(order: number): Question {
  return { type: 'MCQ', text: '', imageUrl: null, videoUrl: null, options: [newOption(), newOption(), newOption(), newOption()], correctId: '', explanation: null, order, marks: 1 }
}

function ImagePicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'upload' | 'url'>(value?.startsWith('http') ? 'url' : value ? 'upload' : 'upload')
  const [urlInput, setUrlInput] = useState(value?.startsWith('http') ? value : '')
  const [sizeWarn, setSizeWarn] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_IMG_KB * 1024) {
      setSizeWarn(true)
      return
    }
    setSizeWarn(false)
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result as string)
    reader.readAsDataURL(file)
  }

  function handleUrlCommit() {
    onChange(urlInput.trim() || null)
  }

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-2">
        <ImageIcon size={13} className="text-charcoal/40" />
        <span className="text-xs font-semibold text-charcoal/60">Question Image</span>
        <div className="flex gap-1 ml-auto">
          <button type="button" onClick={() => setMode('upload')}
            className={`text-xs px-2 py-0.5 rounded-md font-medium transition-colors ${mode === 'upload' ? 'bg-midnight text-white' : 'text-charcoal/50 hover:text-midnight'}`}>
            <Upload size={10} className="inline mr-1" />Upload
          </button>
          <button type="button" onClick={() => setMode('url')}
            className={`text-xs px-2 py-0.5 rounded-md font-medium transition-colors ${mode === 'url' ? 'bg-midnight text-white' : 'text-charcoal/50 hover:text-midnight'}`}>
            <Link2 size={10} className="inline mr-1" />URL
          </button>
        </div>
      </div>

      {mode === 'upload' && (
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          {value && !value.startsWith('http') ? (
            <div className="relative inline-block">
              <img src={value} alt="Q img" className="max-h-32 rounded-xl border border-gray-200 object-contain" />
              <button type="button" onClick={() => { onChange(null); if (fileRef.current) fileRef.current.value = '' }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                <X size={11} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-xs text-charcoal/50 hover:border-midnight/30 hover:text-midnight transition-colors w-full justify-center">
              <Upload size={14} /> Click to upload image (max {MAX_IMG_KB}KB)
            </button>
          )}
          {sizeWarn && <p className="text-xs text-red-500 mt-1">Image too large. Max {MAX_IMG_KB}KB. Compress or use URL mode.</p>}
        </div>
      )}

      {mode === 'url' && (
        <div className="flex gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onBlur={handleUrlCommit}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlCommit()}
            placeholder="https://example.com/image.jpg"
            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-midnight"
          />
          {value?.startsWith('http') && (
            <button type="button" onClick={() => { onChange(null); setUrlInput('') }}
              className="p-1.5 text-charcoal/30 hover:text-red-500 transition-colors"><X size={13} /></button>
          )}
        </div>
      )}
      {value?.startsWith('http') && mode === 'url' && (
        <img src={value} alt="preview" className="mt-2 max-h-24 rounded-xl border border-gray-100 object-contain" />
      )}
    </div>
  )
}

export default function StudentTestEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
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
      return { ...q, options: q.options.map((o, j) => j === optIdx ? { ...o, text } : o) }
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

  const totalMarks = questions.reduce((s, q) => s + q.marks, 0)

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/student-tests">
            <button className="p-2 rounded-xl hover:bg-gray-100 text-charcoal/60 transition-colors"><ArrowLeft size={18} /></button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-midnight">{test?.title}</h1>
            <p className="text-xs text-charcoal/50">{questions.length} questions · {totalMarks} total marks</p>
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
          <Input label="Target Class" placeholder="e.g. 10" value={meta.targetClass ?? ''} onChange={(e) => setMeta((m) => ({ ...m, targetClass: e.target.value }))} />
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
              <div className="flex items-center gap-2 flex-wrap">
                <GripVertical size={16} className="text-charcoal/30 cursor-grab" />
                <span className="text-xs font-bold text-midnight bg-midnight/5 px-2.5 py-1 rounded-lg">Q{qIdx + 1}</span>
                <select value={q.type}
                  onChange={(e) => {
                    const t = e.target.value
                    updateQ(qIdx, {
                      type: t,
                      options: t === 'MCQ' ? (q.options.length >= 2 ? q.options : [newOption(), newOption(), newOption(), newOption()]) : [],
                    })
                  }}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-charcoal focus:outline-none focus:ring-1 focus:ring-midnight">
                  {Q_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="flex items-center gap-1">
                  <label className="text-xs text-charcoal/50">Marks</label>
                  <input type="number" min="1" max="20" value={q.marks}
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

            {/* Image picker — available for MCQ and IMAGE type */}
            {(q.type === 'MCQ' || q.type === 'IMAGE') && (
              <ImagePicker
                value={q.imageUrl}
                onChange={(v) => updateQ(qIdx, { imageUrl: v })}
              />
            )}

            {/* Video URL — MCQ and VIDEO type */}
            {(q.type === 'VIDEO' || q.type === 'MCQ') && (
              <div className="flex items-center gap-2 mb-3">
                <Video size={13} className="text-charcoal/40 flex-shrink-0" />
                <span className="text-xs text-charcoal/50 flex-shrink-0">Video URL</span>
                <input
                  value={q.videoUrl ?? ''}
                  onChange={(e) => updateQ(qIdx, { videoUrl: e.target.value || null })}
                  placeholder="YouTube link or MP4 URL"
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-midnight"
                />
                {q.videoUrl && (
                  <button type="button" onClick={() => updateQ(qIdx, { videoUrl: null })}
                    className="p-1 text-charcoal/30 hover:text-red-500 transition-colors"><X size={13} /></button>
                )}
              </div>
            )}

            {/* MCQ Options */}
            {q.type === 'MCQ' && (
              <div className="flex flex-col gap-2 mb-3">
                <p className="text-xs font-semibold text-charcoal/60">Options — click circle to mark correct answer</p>
                {q.options.map((opt, optIdx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQ(qIdx, { correctId: opt.id })}
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${q.correctId === opt.id ? 'border-forest bg-forest' : 'border-gray-300 hover:border-forest/50'}`}
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
                {!q.correctId && <p className="text-xs text-amber-600">Select correct answer</p>}
                <button onClick={() => addOption(qIdx)} className="text-xs text-midnight/60 hover:text-midnight font-medium mt-1 self-start">
                  + Add option
                </button>
              </div>
            )}

            <input
              value={q.explanation ?? ''}
              onChange={(e) => updateQ(qIdx, { explanation: e.target.value || null })}
              placeholder="Explanation (shown to student after submit)"
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
