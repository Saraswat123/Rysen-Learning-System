'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, ChevronLeft, ChevronRight, CheckCircle, XCircle, Send } from 'lucide-react'
import Button from '@/components/ui/Button'

interface Option { id: string; text: string }
interface Question {
  id: string; type: string; text: string
  imageUrl: string | null; videoUrl: string | null
  options: Option[]; marks: number; order: number
}
interface ResultQuestion extends Question {
  correctId: string; explanation: string | null; yourAnswer: string | null; correct: boolean
}
interface TestData {
  id: string; title: string; timeLimitMinutes: number; passScore: number; questions: Question[]
}
interface Result {
  score: number; totalMarks: number; passed: boolean; questions: ResultQuestion[]
}

export default function StudentTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [test, setTest] = useState<TestData | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [current, setCurrent] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    fetch(`/api/student-tests/${id}`).then((r) => r.json()).then((t) => {
      setTest(t)
      setTimeLeft(t.timeLimitMinutes * 60)
      setLoading(false)
    })
  }, [id])

  const submit = useCallback(async (finalAnswers: Record<string, string>) => {
    if (!test) return
    setSubmitting(true)
    const res = await fetch(`/api/student-tests/${id}/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: finalAnswers }),
    })
    const data = await res.json()
    setResult(data)
    setSubmitting(false)
  }, [test, id])

  useEffect(() => {
    if (!started || !test || result) return
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval)
          submit(answers)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [started, test, result, submit, answers])

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  function answer(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!test) return <p className="text-center py-16 text-charcoal/40">Test not found.</p>

  if (result) {
    const pct = result.totalMarks > 0 ? Math.round((result.score / result.totalMarks) * 100) : 0
    return (
      <div className="max-w-2xl mx-auto">
        <div className={`rounded-2xl p-8 text-center mb-6 ${result.passed ? 'bg-forest text-white' : 'bg-red-600 text-white'}`}>
          {result.passed
            ? <CheckCircle size={48} className="mx-auto mb-3" />
            : <XCircle size={48} className="mx-auto mb-3" />}
          <h1 className="text-2xl font-bold mb-1">{result.passed ? 'Well done! 🎉' : 'Keep trying!'}</h1>
          <p className="text-3xl font-bold mt-2">{pct}%</p>
          <p className="text-sm opacity-80 mt-1">{result.score} / {result.totalMarks} marks</p>
          <p className="text-sm opacity-70 mt-0.5">Pass score: {test.passScore}%</p>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          {result.questions.map((q, i) => (
            <div key={q.id} className={`bg-white rounded-2xl border p-5 ${q.correct ? 'border-forest/30' : 'border-red-200'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${q.correct ? 'bg-forest' : 'bg-red-500'}`}>
                  {q.correct ? <CheckCircle size={14} className="text-white" /> : <XCircle size={14} className="text-white" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-midnight mb-2">Q{i + 1}. {q.text}</p>
                  {q.imageUrl && <img src={q.imageUrl} alt="" className="rounded-xl max-h-32 object-cover mb-2" />}
                  {q.type === 'MCQ' && q.options && (q.options as Option[]).map((opt: Option) => {
                    const isCorrect = opt.id === q.correctId
                    const isYours = opt.id === q.yourAnswer
                    return (
                      <div key={opt.id} className={`text-sm px-3 py-2 rounded-lg mb-1 ${isCorrect ? 'bg-forest/10 text-forest font-semibold' : isYours && !isCorrect ? 'bg-red-50 text-red-600 line-through' : 'text-charcoal/60'}`}>
                        {isCorrect && '✓ '}{opt.text}
                      </div>
                    )
                  })}
                  {q.explanation && (
                    <p className="text-xs text-charcoal/50 mt-2 bg-amber-50 px-3 py-2 rounded-lg">{q.explanation}</p>
                  )}
                </div>
                <div className="text-xs text-charcoal/40 flex-shrink-0">{q.marks}m</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button onClick={() => router.push('/student/dashboard')} className="flex-1 bg-midnight text-white">Back to Dashboard</Button>
          <Button onClick={() => router.push('/student/leaderboard')} className="flex-1 bg-forest text-white">View Leaderboard</Button>
        </div>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="max-w-md mx-auto text-center pt-12">
        <div className="w-20 h-20 rounded-full bg-midnight/5 flex items-center justify-center mx-auto mb-4">
          <Clock size={36} className="text-midnight" />
        </div>
        <h1 className="text-2xl font-bold text-midnight mb-2">{test.title}</h1>
        <p className="text-charcoal/60 mb-6">
          {test.questions.length} questions · {test.timeLimitMinutes} minutes · Pass at {test.passScore}%
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 mb-6 text-left">
          <strong>Instructions:</strong>
          <ul className="mt-1 list-disc list-inside space-y-0.5 text-amber-700">
            <li>The timer starts when you click Begin</li>
            <li>You can navigate between questions</li>
            <li>Test auto-submits when time runs out</li>
          </ul>
        </div>
        <Button onClick={() => setStarted(true)} size="lg" className="w-full">Begin Test</Button>
      </div>
    )
  }

  const q = test.questions[current]
  const totalQ = test.questions.length
  const answered = Object.keys(answers).length
  const urgent = timeLeft < 60

  return (
    <div className="max-w-2xl mx-auto">
      {/* Timer + Progress Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-charcoal/50 font-medium">{test.title}</p>
          <p className="text-sm text-charcoal/70">{answered}/{totalQ} answered</p>
        </div>
        <div className={`flex items-center gap-2 font-bold text-lg ${urgent ? 'text-red-600 animate-pulse' : 'text-midnight'}`}>
          <Clock size={18} />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-midnight bg-midnight/5 px-2.5 py-1 rounded-lg">
            Q{current + 1} / {totalQ}
          </span>
          <span className="text-xs text-charcoal/40">{q.marks} mark{q.marks > 1 ? 's' : ''}</span>
        </div>

        <p className="text-base font-medium text-midnight mb-4">{q.text}</p>

        {q.imageUrl && (
          <img src={q.imageUrl} alt="Question" className="rounded-xl max-h-48 object-contain mb-4 border border-gray-100" />
        )}

        {q.videoUrl && (
          <div className="mb-4">
            {q.videoUrl.includes('youtube') || q.videoUrl.includes('youtu.be') ? (
              <iframe
                src={`https://www.youtube.com/embed/${q.videoUrl.split('v=')[1]?.split('&')[0] ?? q.videoUrl.split('/').pop()}`}
                className="w-full h-48 rounded-xl"
                allowFullScreen
              />
            ) : (
              <video src={q.videoUrl} controls className="w-full rounded-xl max-h-48" />
            )}
          </div>
        )}

        {q.type !== 'TEXT' && (q.options as Option[]).length > 0 && (
          <div className="flex flex-col gap-2">
            {(q.options as Option[]).map((opt: Option) => {
              const selected = answers[q.id] === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => answer(q.id, opt.id)}
                  className={`text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${selected ? 'border-midnight bg-midnight/5 font-semibold text-midnight' : 'border-gray-100 hover:border-gray-200 text-charcoal'}`}>
                  {opt.text}
                </button>
              )
            })}
          </div>
        )}

        {q.type === 'TEXT' && (
          <textarea
            value={answers[q.id] ?? ''}
            onChange={(e) => answer(q.id, e.target.value)}
            placeholder="Type your answer…"
            rows={4}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight resize-none"
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-charcoal hover:bg-gray-50 disabled:opacity-40 transition-colors">
          <ChevronLeft size={16} /> Previous
        </button>

        <div className="flex gap-1.5 flex-wrap justify-center">
          {test.questions.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${i === current ? 'bg-midnight text-white' : answers[test.questions[i].id] ? 'bg-forest/10 text-forest' : 'bg-gray-100 text-charcoal/60 hover:bg-gray-200'}`}>
              {i + 1}
            </button>
          ))}
        </div>

        {current < totalQ - 1 ? (
          <button onClick={() => setCurrent((c) => Math.min(totalQ - 1, c + 1))}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-midnight text-white text-sm font-semibold hover:bg-midnight/80 transition-colors">
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <Button onClick={() => submit(answers)} loading={submitting}
            className="flex items-center gap-1.5 bg-forest text-white">
            <Send size={15} /> Submit
          </Button>
        )}
      </div>
    </div>
  )
}
