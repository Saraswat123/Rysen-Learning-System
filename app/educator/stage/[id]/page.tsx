'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, CheckCircle, XCircle, ArrowLeft, Clock } from 'lucide-react'
import Button from '@/components/ui/Button'
import MCQTimer from '@/components/MCQTimer'

interface Option { id: string; text: string }
interface Question { id: string; type: 'MCQ' | 'TEXT'; text: string; options: Option[]; explanation?: string }
interface StageDoc { id: string; title: string; url: string; order: number }
interface Stage {
  id: string; number: number; title: string; subtitle: string
  docUrl: string | null; docs: StageDoc[]; timeLimitMinutes: number; passScore: number
  maxAttempts: number; badgeTitle: string | null; badgeColor: string
  questions: Question[]
  progress: { passed: boolean; attempts: number; bestScore: number | null; docRead: boolean } | null
}

type Phase = 'doc' | 'mcq' | 'result'

interface MCQResult {
  score: number; passed: boolean; correct: number; total: number
  attemptsUsed: number; attemptsRemaining: number
  results: { questionId: string; isCorrect: boolean; correct: string; explanation?: string }[]
}

export default function StagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [stage, setStage] = useState<Stage | null>(null)
  const [phase, setPhase] = useState<Phase>('doc')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<MCQResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [openedDocs, setOpenedDocs] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch(`/api/stages/${id}`).then((r) => r.json()).then((data) => {
      setStage(data)
      if (data.progress?.docRead) setPhase('mcq')
    })
  }, [id])

  async function markDocRead() {
    await fetch('/api/progress/doc-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stageId: id }),
    })
    setPhase('mcq')
  }

  const handleTimeout = useCallback(() => {
    setTimedOut(true)
    submitMCQ()
  }, [answers]) // eslint-disable-line

  async function submitMCQ() {
    if (!stage) return
    setSubmitting(true)
    const res = await fetch(`/api/mcq/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, textAnswers }),
    })
    const data = await res.json()
    setResult(data)
    setPhase('result')
    setSubmitting(false)
  }

  if (!stage) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const mcqQuestions = stage?.questions.filter((q) => q.type === 'MCQ') ?? []
  const textQuestions = stage?.questions.filter((q) => q.type === 'TEXT') ?? []
  const answeredMCQ = Object.keys(answers).length
  const answeredText = textQuestions.filter((q) => (textAnswers[q.id] ?? '').trim().length > 0).length
  const answeredCount = answeredMCQ + answeredText
  const totalRequired = mcqQuestions.length + textQuestions.length

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.push('/educator/dashboard')} className="flex items-center gap-2 text-sm text-charcoal/60 hover:text-midnight mb-6">
        <ArrowLeft size={16} /> Back to Journey
      </button>

      {/* Stage Header */}
      <div className="rounded-2xl p-6 mb-6 text-white" style={{ backgroundColor: stage.badgeColor === '#FECB08' ? '#033D4C' : stage.badgeColor }}>
        <div className="text-gold text-sm font-medium mb-1">Stage {stage.number}</div>
        <h1 className="text-2xl font-bold">{stage.title}</h1>
        <p className="text-white/70 text-sm mt-1">{stage.subtitle}</p>
      </div>

      {/* DOC PHASE */}
      {phase === 'doc' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-bold text-midnight text-lg mb-3">Step 1: Read the Training Documents</h2>
          <p className="text-sm text-charcoal/60 mb-5">
            Open and read each document carefully before taking the MCQ.
          </p>

          {(() => {
            const docs = stage.docs?.filter((d) => d.url) ?? []
            const legacyDoc = !docs.length && stage.docUrl ? [{ id: 'legacy', title: 'Training Document', url: stage.docUrl, order: 0 }] : []
            const allDocs = [...docs, ...legacyDoc]
            const allOpened = allDocs.length > 0 && allDocs.every((d) => openedDocs.has(d.id))
            return allDocs.length > 0 ? (
              <>
                <p className="text-xs text-charcoal/40 mb-3">{openedDocs.size}/{allDocs.length} opened</p>
                <div className="flex flex-col gap-3 mb-5">
                  {allDocs.map((doc, i) => {
                    const opened = openedDocs.has(doc.id)
                    return (
                      <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer"
                        onClick={() => setOpenedDocs((s) => new Set([...s, doc.id]))}
                        className={`flex items-center gap-3 text-sm font-semibold px-5 py-3 rounded-xl border transition-colors ${opened ? 'bg-forest/10 border-forest/30 text-forest' : 'bg-cream hover:bg-gold/20 border-gold/30 text-midnight'}`}>
                        <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${opened ? 'bg-forest text-white' : 'bg-gold/30 text-midnight'}`}>
                          {opened ? '✓' : i + 1}
                        </span>
                        <span className="flex-1">{doc.title || `Document ${i + 1}`}</span>
                        <ExternalLink size={14} className={opened ? 'text-forest' : 'text-gold'} />
                      </a>
                    )
                  })}
                </div>
                {!allOpened && (
                  <p className="text-xs text-amber-600 mb-3 text-center">Open all documents to continue</p>
                )}
                <Button onClick={markDocRead} disabled={!allOpened} className="w-full">
                  <CheckCircle size={16} /> I&apos;ve Read All Documents — Start MCQ
                </Button>
              </>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                Training documents not yet uploaded. Contact your admin.
              </div>
            )
          })()}
        </div>
      )}

      {/* MCQ PHASE */}
      {phase === 'mcq' && (
        <div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-midnight">{stage.questions.length} Questions</p>
              <p className="text-xs text-charcoal/50">
                {mcqQuestions.length} MCQ · {textQuestions.length} Text · Pass: {stage.passScore}% (MCQ only) · Attempts left: {stage.maxAttempts - (stage.progress?.attempts ?? 0)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-charcoal/50">{answeredCount}/{totalRequired} answered</span>
              <MCQTimer minutes={stage.timeLimitMinutes} onExpire={handleTimeout} />
            </div>
          </div>

          {timedOut && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 mb-4 flex items-center gap-2">
              <Clock size={16} /> Time&apos;s up! Your answers have been submitted automatically.
            </div>
          )}

          <div className="flex flex-col gap-4">
            {stage.questions.map((q, qi) => (
              <div key={q.id} className={`bg-white rounded-2xl border p-5 ${q.type === 'TEXT' ? 'border-olive/30' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gold/20 text-midnight">Q{qi + 1}</span>
                  {q.type === 'TEXT' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-olive/20 text-olive font-medium">Reflective</span>
                  )}
                </div>
                <p className="font-semibold text-midnight mb-4 text-sm leading-relaxed">{q.text}</p>

                {q.type === 'MCQ' ? (
                  <div className="flex flex-col gap-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.id }))}
                        className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${answers[q.id] === opt.id ? 'border-midnight bg-midnight text-white' : 'border-gray-200 hover:border-midnight/40 hover:bg-cream/50'}`}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div>
                    {q.explanation && (
                      <p className="text-xs text-olive/70 italic mb-2">{q.explanation}</p>
                    )}
                    <textarea
                      placeholder="Write your response here..."
                      value={textAnswers[q.id] ?? ''}
                      onChange={(e) => setTextAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 border border-olive/30 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-olive/50 bg-olive/5"
                    />
                    <p className="text-xs text-charcoal/40 mt-1">{(textAnswers[q.id] ?? '').length} characters</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={submitMCQ}
            loading={submitting}
            disabled={answeredCount < totalRequired}
            className="w-full mt-6"
            size="lg"
          >
            Submit Answers ({answeredCount}/{totalRequired})
          </Button>
        </div>
      )}

      {/* RESULT PHASE */}
      {phase === 'result' && result && (
        <div className="flex flex-col gap-5">
          {/* Score card */}
          <div className={`rounded-2xl p-8 text-center ${result.passed ? 'bg-forest text-white' : 'bg-charcoal text-white'}`}>
            {result.passed ? (
              <>
                <CheckCircle size={48} className="mx-auto mb-3 text-gold" />
                <h2 className="text-2xl font-bold mb-1">Congratulations! 🎉</h2>
                <p className="text-white/80 mb-4">You passed Stage {stage.number}!</p>
              </>
            ) : (
              <>
                <XCircle size={48} className="mx-auto mb-3 text-red-400" />
                <h2 className="text-2xl font-bold mb-1">Not Passed</h2>
                <p className="text-white/80 mb-4">Keep trying — you can do it!</p>
              </>
            )}
            <div className="text-5xl font-bold mb-2">{result.score}%</div>
            <p className="text-white/60 text-sm">{result.correct}/{result.total} correct</p>
            {!result.passed && result.attemptsRemaining > 0 && (
              <p className="text-white/60 text-sm mt-1">{result.attemptsRemaining} attempts remaining</p>
            )}
          </div>

          {/* Badge earned */}
          {result.passed && stage.badgeTitle && (
            <div className="bg-white rounded-2xl border-2 border-gold p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ backgroundColor: stage.badgeColor }}>
                🏅
              </div>
              <div>
                <p className="text-xs font-medium text-charcoal/50 uppercase tracking-wide">Badge Earned</p>
                <p className="font-bold text-midnight text-lg">{stage.badgeTitle}</p>
              </div>
            </div>
          )}

          {/* Answer review */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold text-midnight mb-4">Answer Review</h3>
            <div className="flex flex-col gap-3">
              {result.results.map((r, i) => {
                const q = stage.questions.find((q) => q.id === r.questionId)
                const isText = q?.type === 'TEXT'
                const correctOpt = isText ? null : q?.options.find((o) => o.id === (r as { correct?: string }).correct)
                return (
                  <div key={i} className={`p-3 rounded-xl text-sm ${isText ? 'bg-olive/10 border border-olive/20' : r.isCorrect ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                    <div className="flex items-start gap-2">
                      {isText
                        ? <CheckCircle size={15} className="text-olive mt-0.5 flex-shrink-0" />
                        : r.isCorrect
                          ? <CheckCircle size={15} className="text-forest mt-0.5 flex-shrink-0" />
                          : <XCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />}
                      <div>
                        <p className="font-medium text-charcoal mb-1">Q{i + 1}: {q?.text}</p>
                        {isText && (r as { response?: string }).response && (
                          <p className="text-xs text-charcoal/60 italic">Your answer: {(r as { response?: string }).response}</p>
                        )}
                        {!isText && !r.isCorrect && (
                          <p className="text-xs text-charcoal/60">Correct: <span className="font-medium text-forest">{correctOpt?.text}</span></p>
                        )}
                        {r.explanation && <p className="text-xs text-charcoal/50 mt-1 italic">{r.explanation}</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {!result.passed && result.attemptsRemaining > 0 ? (
              <Button onClick={() => { setAnswers({}); setPhase('mcq'); setResult(null); setTimedOut(false) }} className="flex-1">
                Try Again
              </Button>
            ) : null}
            <Button onClick={() => router.push('/educator/dashboard')} variant={result.passed ? 'primary' : 'ghost'} className="flex-1">
              {result.passed ? 'Continue Journey →' : 'Back to Dashboard'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
