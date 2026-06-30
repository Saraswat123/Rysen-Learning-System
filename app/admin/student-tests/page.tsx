'use client'

import { useState, useEffect } from 'react'
import { Plus, ClipboardList, Users, Clock, Eye, EyeOff, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface StudentTest {
  id: string; title: string; description: string | null
  subject: string; targetClass: string; timeLimitMinutes: number
  passScore: number; isPublished: boolean; order: number
  _count: { questions: number; attempts: number }
}

export default function StudentTestsPage() {
  const [tests, setTests] = useState<StudentTest[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', subject: '', targetClass: '', timeLimitMinutes: '30', passScore: '60' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const data = await fetch('/api/student-tests').then((r) => r.json())
    setTests(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createTest(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/student-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        timeLimitMinutes: parseInt(form.timeLimitMinutes),
        passScore: parseInt(form.passScore),
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setShowAdd(false)
    setForm({ title: '', description: '', subject: '', targetClass: '', timeLimitMinutes: '30', passScore: '60' })
    load()
  }

  async function togglePublish(test: StudentTest) {
    await fetch(`/api/student-tests/${test.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !test.isPublished }),
    })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-midnight">Student Tests</h1>
          <p className="text-sm text-charcoal/60 mt-0.5">{tests.length} test sets</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2">
          <Plus size={15} /> Create Test
        </Button>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-midnight mb-4">Create Test</h2>
            <form onSubmit={createTest} className="flex flex-col gap-3">
              <Input label="Test Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
              <Input label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Subject" placeholder="e.g. Science" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
                <Input label="Target Class" placeholder="e.g. 10" value={form.targetClass} onChange={(e) => setForm((f) => ({ ...f, targetClass: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-charcoal">Time Limit (min)</label>
                  <input type="number" min="5" max="180" value={form.timeLimitMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, timeLimitMinutes: e.target.value }))}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-charcoal">Pass Score (%)</label>
                  <input type="number" min="0" max="100" value={form.passScore}
                    onChange={(e) => setForm((f) => ({ ...f, passScore: e.target.value }))}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight" />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-3 mt-2">
                <Button type="button" onClick={() => setShowAdd(false)} className="flex-1 bg-gray-100 text-charcoal hover:bg-gray-200">Cancel</Button>
                <Button type="submit" loading={saving} className="flex-1">Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tests.map((test) => (
            <div key={test.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-midnight/5 flex items-center justify-center flex-shrink-0">
                <ClipboardList size={22} className="text-midnight" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-midnight">{test.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${test.isPublished ? 'bg-forest/10 text-forest' : 'bg-amber-100 text-amber-700'}`}>
                    {test.isPublished ? 'Published' : 'Draft'}
                  </span>
                  {test.targetClass && <span className="text-xs bg-midnight/5 text-midnight px-2 py-0.5 rounded-full">Class {test.targetClass}</span>}
                  {test.subject && <span className="text-xs bg-olive/10 text-olive px-2 py-0.5 rounded-full">{test.subject}</span>}
                </div>
                {test.description && <p className="text-sm text-charcoal/60 mt-0.5 truncate">{test.description}</p>}
                <div className="flex items-center gap-4 mt-1.5 text-xs text-charcoal/50">
                  <span className="flex items-center gap-1"><ClipboardList size={11} /> {test._count.questions} questions</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> {test.timeLimitMinutes} min</span>
                  <span className="flex items-center gap-1"><Users size={11} /> {test._count.attempts} attempts</span>
                  <span>Pass: {test.passScore}%</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => togglePublish(test)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-charcoal/40 hover:text-charcoal transition-colors" title={test.isPublished ? 'Unpublish' : 'Publish'}>
                  {test.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <Link href={`/admin/student-tests/${test.id}`}>
                  <button className="flex items-center gap-1.5 px-3 py-2 bg-midnight text-white text-xs font-semibold rounded-xl hover:bg-midnight/80 transition-colors">
                    Edit <ChevronRight size={14} />
                  </button>
                </Link>
              </div>
            </div>
          ))}
          {tests.length === 0 && (
            <div className="text-center py-16 text-charcoal/40">
              <ClipboardList size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No tests created yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
