'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Layers, ClipboardList, Check, Save, Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface Test { id: string; title: string; targetClass: string; _count: { questions: number; attempts: number } }
interface Program {
  id: string; title: string; description: string | null; targetClass: string
  tests: Test[]
}
interface AllTest { id: string; title: string; targetClass: string; programId: string | null; _count: { questions: number } }

export default function StudentProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [program, setProgram] = useState<Program | null>(null)
  const [allTests, setAllTests] = useState<AllTest[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({ title: '', description: '', targetClass: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showNewTopic, setShowNewTopic] = useState(false)
  const [topicTitle, setTopicTitle] = useState('')
  const [creatingTopic, setCreatingTopic] = useState(false)

  async function load() {
    setLoading(true)
    const [p, tests] = await Promise.all([
      fetch(`/api/student-programs/${id}`).then((r) => r.json()),
      fetch('/api/student-tests').then((r) => r.json()),
    ])
    setProgram(p)
    setForm({ title: p.title, description: p.description ?? '', targetClass: p.targetClass ?? '' })
    setSelectedIds(new Set(p.tests.map((t: Test) => t.id)))
    setAllTests(Array.isArray(tests) ? tests : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  function toggleTest(testId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(testId) ? next.delete(testId) : next.add(testId)
      return next
    })
  }

  async function save() {
    setSaving(true)
    await fetch(`/api/student-programs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, testIds: [...selectedIds] }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    load()
  }

  async function createTopic(e: React.FormEvent) {
    e.preventDefault()
    if (!topicTitle.trim()) return
    setCreatingTopic(true)
    const res = await fetch('/api/student-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: topicTitle.trim(),
        targetClass: form.targetClass || program?.targetClass || '',
        programId: id,
      }),
    })
    const data = await res.json()
    setCreatingTopic(false)
    if (res.ok) router.push(`/educator/student-tests/${data.id}`)
  }

  if (loading || !program) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" /></div>
  }

  // A test already in a different program is shown disabled — attaching it here would silently steal it
  const otherProgramTestIds = new Set(allTests.filter((t) => t.programId && t.programId !== id).map((t) => t.id))

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/educator/student-programs" className="flex items-center gap-1.5 text-sm text-charcoal/50 hover:text-midnight mb-4 transition-colors">
        <ChevronLeft size={16} /> Student Programs
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-midnight/5 flex items-center justify-center flex-shrink-0">
          <Layers size={22} className="text-midnight" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-midnight">{program.title}</h1>
          <p className="text-sm text-charcoal/60">{selectedIds.size} test{selectedIds.size !== 1 ? 's' : ''} attached</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="text-sm font-bold text-midnight uppercase tracking-wide mb-4">Details</h2>
        <div className="flex flex-col gap-3">
          <Input label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Input label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Input label="Target Class" value={form.targetClass} onChange={(e) => setForm((f) => ({ ...f, targetClass: e.target.value }))} />
        </div>
      </div>

      {showNewTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-midnight mb-1">New Topic</h2>
            <p className="text-xs text-charcoal/50 mb-4">Creates a new MCQ test inside this program. You'll add questions on the next screen.</p>
            <form onSubmit={createTopic} className="flex flex-col gap-3">
              <Input label="Topic Title" placeholder="e.g. Photosynthesis Basics" value={topicTitle} onChange={(e) => setTopicTitle(e.target.value)} required autoFocus />
              <div className="flex gap-3 mt-2">
                <Button type="button" onClick={() => { setShowNewTopic(false); setTopicTitle('') }} className="flex-1 bg-gray-100 text-charcoal hover:bg-gray-200">Cancel</Button>
                <Button type="submit" loading={creatingTopic} className="flex-1">Create &amp; Add Questions</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-midnight uppercase tracking-wide">Topics in this Program</h2>
          <button type="button" onClick={() => setShowNewTopic(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-midnight hover:underline">
            <Plus size={13} /> New Topic
          </button>
        </div>
        <p className="text-xs text-charcoal/50 mb-4">Create a new topic above, or attach one of your branch's existing tests below. Students see these grouped under "{form.title || program.title}".</p>
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {allTests.map((t) => {
            const locked = otherProgramTestIds.has(t.id)
            const checked = selectedIds.has(t.id)
            return (
              <button key={t.id} type="button" disabled={locked} onClick={() => toggleTest(t.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${locked ? 'opacity-40 cursor-not-allowed border-gray-100' : checked ? 'border-midnight bg-midnight/5' : 'border-gray-100 hover:border-gray-200'}`}>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${checked ? 'bg-midnight' : 'bg-gray-100'}`}>
                  {checked && <Check size={13} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-midnight truncate">{t.title}</p>
                  <p className="text-xs text-charcoal/50 flex items-center gap-1">
                    <ClipboardList size={11} /> {t._count.questions} questions
                    {t.targetClass && ` · Class ${t.targetClass}`}
                    {locked && ' · In another program'}
                  </p>
                </div>
              </button>
            )
          })}
          {allTests.length === 0 && <p className="text-sm text-charcoal/40 text-center py-8">No student tests exist yet — create one first.</p>}
        </div>
      </div>

      <Button onClick={save} loading={saving} className="mt-6 w-full flex items-center justify-center gap-2">
        {saved ? <><Check size={16} /> Saved</> : <><Save size={16} /> Save Changes</>}
      </Button>
    </div>
  )
}
