'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, ChevronLeft, ChevronRight, CheckCircle, XCircle, Send, Download, LayoutDashboard, Trophy } from 'lucide-react'
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

function downloadResponseSheet(
  studentName: string,
  testTitle: string,
  result: Result,
  passScore: number,
) {
  const pct = result.totalMarks > 0 ? Math.round((result.score / result.totalMarks) * 100) : 0
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

  const rows = result.questions.map((q, i) => {
    const opts = (q.options as Option[])
    const yourOpt = opts.find((o) => o.id === q.yourAnswer)
    const correctOpt = opts.find((o) => o.id === q.correctId)
    return `
      <tr style="border-bottom:1px solid #e5e7eb; ${q.correct ? '' : 'background:#fff7f7'}">
        <td style="padding:10px 12px; font-weight:600; color:#033D4C; vertical-align:top;">${i + 1}</td>
        <td style="padding:10px 12px; vertical-align:top; max-width:340px;">
          <div style="font-size:13px; color:#1a1a1a; margin-bottom:4px;">${q.text}</div>
          ${q.imageUrl ? `<img src="${q.imageUrl}" style="max-height:80px;border-radius:8px;margin-top:4px;" />` : ''}
        </td>
        <td style="padding:10px 12px; vertical-align:top; font-size:13px;">
          ${yourOpt ? yourOpt.text : q.yourAnswer ? q.yourAnswer : '<span style="color:#9ca3af">—</span>'}
        </td>
        <td style="padding:10px 12px; vertical-align:top; font-size:13px; color:#225632; font-weight:600;">
          ${correctOpt ? correctOpt.text : '—'}
        </td>
        <td style="padding:10px 12px; vertical-align:top; text-align:center;">
          <span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:${q.correct ? '#225632' : '#dc2626'};color:#fff;font-size:12px;line-height:22px;text-align:center;">${q.correct ? '✓' : '✗'}</span>
        </td>
        <td style="padding:10px 12px; vertical-align:top; text-align:center; font-size:13px; color:#40403E;">
          ${q.correct ? q.marks : 0}/${q.marks}
        </td>
      </tr>
      ${q.explanation ? `<tr style="background:#fffbeb; border-bottom:1px solid #e5e7eb;"><td></td><td colspan="5" style="padding:6px 12px 10px; font-size:12px; color:#92400e;"><strong>Explanation:</strong> ${q.explanation}</td></tr>` : ''}
    `
  }).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Response Sheet — ${testTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; background: #fff; }
    @page { margin: 20mm 15mm; }
    @media print { .no-print { display: none !important; } }
    .header { background: #033D4C; color: white; padding: 28px 32px; display: flex; justify-content: space-between; align-items: flex-start; }
    .header h1 { font-size: 20px; font-weight: 700; }
    .header p { font-size: 13px; opacity: 0.75; margin-top: 4px; }
    .score-badge { background: ${result.passed ? '#225632' : '#dc2626'}; color: white; border-radius: 12px; padding: 12px 20px; text-align: center; min-width: 120px; }
    .score-badge .pct { font-size: 28px; font-weight: 700; }
    .score-badge .label { font-size: 12px; opacity: 0.85; }
    .meta { padding: 16px 32px; background: #f5f0e8; display: flex; gap: 32px; font-size: 13px; border-bottom: 1px solid #e5e7eb; }
    .meta span { color: #40403E; }
    .meta strong { color: #033D4C; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #033D4C; color: white; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; }
    .footer { padding: 20px 32px; border-top: 2px solid #033D4C; margin-top: 8px; display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; }
    .print-btn { position: fixed; bottom: 24px; right: 24px; background: #033D4C; color: white; border: none; border-radius: 12px; padding: 12px 24px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size:11px;opacity:0.6;margin-bottom:6px;letter-spacing:1px;">RYSEN GROUP OF SCHOOLS · STUDENT RESPONSE SHEET</div>
      <h1>${testTitle}</h1>
      <p>Student: ${studentName} · Date: ${date}</p>
    </div>
    <div class="score-badge">
      <div class="pct">${pct}%</div>
      <div style="font-size:13px;margin:2px 0;">${result.score}/${result.totalMarks} marks</div>
      <div class="label">${result.passed ? '✓ PASSED' : '✗ NOT PASSED'}</div>
    </div>
  </div>
  <div class="meta">
    <span><strong>Total Questions:</strong> ${result.questions.length}</span>
    <span><strong>Correct:</strong> ${result.questions.filter(q => q.correct).length}</span>
    <span><strong>Wrong:</strong> ${result.questions.filter(q => !q.correct).length}</span>
    <span><strong>Pass Score:</strong> ${passScore}%</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th>Question</th>
        <th style="width:160px">Your Answer</th>
        <th style="width:160px">Correct Answer</th>
        <th style="width:50px;text-align:center">Result</th>
        <th style="width:70px;text-align:center">Marks</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    <span>Generated on ${date} · RYSEN Learning Centre</span>
    <span>Rise To Success</span>
  </div>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save PDF</button>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (win) {
    win.onload = () => {
      setTimeout(() => win.print(), 500)
    }
  }
}

export default function StudentTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [test, setTest] = useState<TestData | null>(null)
  const [student, setStudent] = useState<{ name: string } | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [current, setCurrent] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/student-tests/${id}`).then((r) => r.json()),
      fetch('/api/auth/student-me').then((r) => r.json()),
    ]).then(([t, m]) => {
      setTest(t)
      setStudent(m.student)
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
        if (t <= 1) { clearInterval(interval); submit(answers); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [started, test, result, submit, answers])

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    return `${m}:${(s % 60).toString().padStart(2, '0')}`
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

  /* ── RESULT SCREEN ── */
  if (result) {
    const pct = result.totalMarks > 0 ? Math.round((result.score / result.totalMarks) * 100) : 0
    const correct = result.questions.filter((q) => q.correct).length

    return (
      <div className="max-w-2xl mx-auto">
        {/* Score card */}
        <div className={`rounded-2xl p-8 text-center mb-4 ${result.passed ? 'bg-forest text-white' : 'bg-red-600 text-white'}`}>
          {result.passed ? <CheckCircle size={48} className="mx-auto mb-3" /> : <XCircle size={48} className="mx-auto mb-3" />}
          <h1 className="text-2xl font-bold mb-1">{result.passed ? 'Well done! 🎉' : 'Keep trying!'}</h1>
          <p className="text-4xl font-bold mt-2">{pct}%</p>
          <p className="text-sm opacity-80 mt-1">{result.score} / {result.totalMarks} marks · {correct}/{result.questions.length} correct</p>
          <p className="text-sm opacity-60 mt-0.5">Pass score: {test.passScore}%</p>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <button
            onClick={() => downloadResponseSheet(student?.name ?? 'Student', test.title, result, test.passScore)}
            className="flex flex-col items-center gap-1.5 py-3 bg-white border-2 border-midnight/20 rounded-2xl text-midnight font-semibold hover:border-midnight hover:bg-midnight/5 transition-all text-xs">
            <Download size={20} />
            Response Sheet
          </button>
          <button onClick={() => router.push('/student/leaderboard')}
            className="flex flex-col items-center gap-1.5 py-3 bg-white border border-gray-100 rounded-2xl text-charcoal/70 hover:bg-gray-50 transition-all text-xs">
            <Trophy size={20} />
            Leaderboard
          </button>
          <button onClick={() => router.push('/student/dashboard')}
            className="flex flex-col items-center gap-1.5 py-3 bg-midnight rounded-2xl text-white font-semibold hover:bg-midnight/80 transition-all text-xs">
            <LayoutDashboard size={20} />
            Dashboard
          </button>
        </div>

        {/* Q-by-Q review */}
        <div className="flex flex-col gap-3">
          {result.questions.map((q, i) => (
            <div key={q.id} className={`bg-white rounded-2xl border p-5 ${q.correct ? 'border-forest/30' : 'border-red-200'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${q.correct ? 'bg-forest' : 'bg-red-500'}`}>
                  {q.correct ? <CheckCircle size={14} className="text-white" /> : <XCircle size={14} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-midnight mb-2">Q{i + 1}. {q.text}</p>
                  {q.imageUrl && <img src={q.imageUrl} alt="" className="rounded-xl max-h-32 object-contain mb-2 border border-gray-100" />}
                  {q.type === 'MCQ' && (q.options as Option[]).map((opt: Option) => {
                    const isCorrect = opt.id === q.correctId
                    const isYours = opt.id === q.yourAnswer
                    return (
                      <div key={opt.id} className={`text-sm px-3 py-2 rounded-lg mb-1 ${isCorrect ? 'bg-forest/10 text-forest font-semibold' : isYours && !isCorrect ? 'bg-red-50 text-red-600 line-through' : 'text-charcoal/50'}`}>
                        {isCorrect ? '✓ ' : isYours && !isCorrect ? '✗ ' : ''}{opt.text}
                      </div>
                    )
                  })}
                  {q.type === 'TEXT' && q.yourAnswer && (
                    <div className="text-sm px-3 py-2 rounded-lg bg-gray-50 text-charcoal mb-1">Your answer: {q.yourAnswer}</div>
                  )}
                  {q.explanation && (
                    <p className="text-xs text-amber-700 mt-2 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                      <strong>Explanation:</strong> {q.explanation}
                    </p>
                  )}
                </div>
                <div className={`text-xs font-bold flex-shrink-0 ${q.correct ? 'text-forest' : 'text-red-500'}`}>
                  {q.correct ? q.marks : 0}/{q.marks}m
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom repeat download */}
        <div className="mt-6">
          <button
            onClick={() => downloadResponseSheet(student?.name ?? 'Student', test.title, result, test.passScore)}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-midnight text-white font-semibold rounded-2xl hover:bg-midnight/80 transition-colors">
            <Download size={18} /> Download Response Sheet (PDF)
          </button>
        </div>
      </div>
    )
  }

  /* ── START SCREEN ── */
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
            <li>Timer starts when you click Begin</li>
            <li>Navigate freely between questions</li>
            <li>Test auto-submits when time runs out</li>
            <li>Download your response sheet after submission</li>
          </ul>
        </div>
        <Button onClick={() => setStarted(true)} size="lg" className="w-full">Begin Test</Button>
      </div>
    )
  }

  /* ── TEST SCREEN ── */
  const q = test.questions[current]
  const totalQ = test.questions.length
  const answered = Object.keys(answers).length
  const urgent = timeLeft < 60

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-charcoal/50 font-medium truncate max-w-48">{test.title}</p>
          <p className="text-sm text-charcoal/70">{answered}/{totalQ} answered</p>
        </div>
        <div className={`flex items-center gap-2 font-bold text-lg ${urgent ? 'text-red-600 animate-pulse' : 'text-midnight'}`}>
          <Clock size={18} /> {formatTime(timeLeft)}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-midnight bg-midnight/5 px-2.5 py-1 rounded-lg">Q{current + 1} / {totalQ}</span>
          <span className="text-xs text-charcoal/40">{q.marks} mark{q.marks > 1 ? 's' : ''}</span>
        </div>

        <p className="text-base font-medium text-midnight mb-4">{q.text}</p>

        {q.imageUrl && (
          <img src={q.imageUrl} alt="Question" className="rounded-xl max-h-56 object-contain mb-4 border border-gray-100 w-full" />
        )}

        {q.videoUrl && (
          <div className="mb-4">
            {q.videoUrl.includes('youtube') || q.videoUrl.includes('youtu.be') ? (
              <iframe
                src={`https://www.youtube.com/embed/${q.videoUrl.split('v=')[1]?.split('&')[0] ?? q.videoUrl.split('/').pop()}`}
                className="w-full h-48 rounded-xl" allowFullScreen />
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
                <button key={opt.id} onClick={() => answer(q.id, opt.id)}
                  className={`text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${selected ? 'border-midnight bg-midnight/5 font-semibold text-midnight' : 'border-gray-100 hover:border-gray-200 text-charcoal'}`}>
                  {opt.text}
                </button>
              )
            })}
          </div>
        )}

        {q.type === 'TEXT' && (
          <textarea value={answers[q.id] ?? ''} onChange={(e) => answer(q.id, e.target.value)}
            placeholder="Type your answer…" rows={4}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight resize-none" />
        )}
      </div>

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
