'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, CheckCircle, XCircle, ArrowLeft, Clock, Lock } from 'lucide-react'
import Button from '@/components/ui/Button'
import MCQTimer from '@/components/MCQTimer'

interface Option { id: string; text: string }
interface Question { id: string; type: 'MCQ' | 'TEXT'; text: string; options: Option[]; explanation?: string; docGroupId?: string | null }
interface StageDoc { id: string; title: string; url: string; order: number }
interface Stage {
  id: string; number: number; title: string; subtitle: string
  docUrl: string | null; docs: StageDoc[]; timeLimitMinutes: number; passScore: number
  maxAttempts: number; badgeTitle: string | null; badgeColor: string
  questions: Question[]
  progress: { passed: boolean; attempts: number; bestScore: number | null; docRead: boolean } | null
}

interface MCQResult {
  score: number; passed: boolean; correct: number; total: number
  attemptsUsed: number; attemptsRemaining: number
  results: { questionId: string; isCorrect: boolean; correct: string; explanation?: string }[]
}

export default function StagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [stage, setStage] = useState<Stage | null>(null)
  const [phase, setPhase] = useState<'quiz' | 'result'>('quiz')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({})
  const [openedDocs, setOpenedDocs] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<MCQResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    fetch(`/api/stages/${id}`).then((r) => r.json()).then((data) => {
      setStage(data)
    })
  }, [id])

  const handleTimeout = useCallback(() => {
    setTimedOut(true)
    submitQuiz()
  }, [answers]) // eslint-disable-line

  async function submitQuiz() {
    if (!stage) return
    setSubmitting(true)
    // Mark all docs as read before submitting
    await fetch('/api/progress/doc-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stageId: id }),
    })
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

  // Build doc groups
  const docs = (stage.docs ?? []).filter((d) => d.url)
  const legacyDoc = !docs.length && stage.docUrl ? [{ id: 'legacy', title: 'Training Document', url: stage.docUrl, order: 0 }] : []
  const allDocs = [...docs, ...legacyDoc]

  // Group questions by docGroupId
  const groups: { doc: StageDoc | null; questions: Question[] }[] = [
    ...allDocs.map((doc) => ({
      doc,
      questions: stage.questions.filter((q) => q.docGroupId === doc.id),
    })),
  ]
  const ungroupedQs = stage.questions.filter(
    (q) => !q.docGroupId || !allDocs.find((d) => d.id === q.docGroupId)
  )

  const mcqQuestions = stage.questions.filter((q) => q.type === 'MCQ')
  const textQuestions = stage.questions.filter((q) => q.type === 'TEXT')
  const answeredMCQ = Object.keys(answers).length
  const answeredText = textQuestions.filter((q) => (textAnswers[q.id] ?? '').trim().length > 0).length
  const answeredCount = answeredMCQ + answeredText
  const totalRequired = mcqQuestions.length + textQuestions.length
  const allDocsOpened = allDocs.length === 0 || allDocs.every((d) => openedDocs.has(d.id))
  const canSubmit = allDocsOpened && answeredCount >= totalRequired

  function renderQuestion(q: Question, qi: number, locked: boolean) {
    return (
      <div key={q.id} className={`rounded-xl border p-5 transition-all ${locked ? 'opacity-40 pointer-events-none' : q.type === 'TEXT' ? 'bg-white border-olive/30' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gold/20 text-midnight">Q{qi + 1}</span>
          {q.type === 'TEXT' && <span className="text-xs px-2 py-0.5 rounded-full bg-olive/20 text-olive font-medium">Reflective</span>}
          {locked && <span className="text-xs text-charcoal/40 flex items-center gap-1"><Lock size={11} /> Open doc to unlock</span>}
        </div>
        <p className="font-semibold text-midnight mb-4 text-sm leading-relaxed">{q.text}</p>

        {q.type === 'MCQ' ? (
          <div className="flex flex-col gap-2">
            {q.options.map((opt) => (
              <button key={opt.id}
                onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.id }))}
                className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${answers[q.id] === opt.id ? 'border-midnight bg-midnight text-white' : 'border-gray-200 hover:border-midnight/40 hover:bg-cream/50'}`}>
                {opt.text}
              </button>
            ))}
          </div>
        ) : (
          <div>
            {q.explanation && <p className="text-xs text-olive/70 italic mb-2">{q.explanation}</p>}
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
    )
  }

  // Track global question index for numbering
  let globalQIdx = 0

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

      {/* QUIZ PHASE */}
      {phase === 'quiz' && (
        <div>
          {/* Progress bar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-midnight">{stage.questions.length} Questions</p>
              <p className="text-xs text-charcoal/50">
                {mcqQuestions.length} MCQ · {textQuestions.length} Text · Pass: {stage.passScore}% · Attempts left: {stage.maxAttempts - (stage.progress?.attempts ?? 0)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-charcoal/50">{answeredCount}/{totalRequired} answered</span>
              <MCQTimer minutes={stage.timeLimitMinutes} onExpire={handleTimeout} />
            </div>
          </div>

          {timedOut && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 mb-4 flex items-center gap-2">
              <Clock size={16} /> Time&apos;s up! Answers submitted automatically.
            </div>
          )}

          <div className="flex flex-col gap-5">
            {/* Doc groups with their questions */}
            {groups.map(({ doc, questions: groupQs }) => {
              if (!doc) return null
              const opened = openedDocs.has(doc.id)
              return (
                <div key={doc.id} className={`rounded-2xl border-2 overflow-hidden transition-all ${opened ? 'border-forest/30' : 'border-gold/30'}`}>
                  {/* Doc header */}
                  <div className={`px-5 py-3.5 flex items-center gap-3 ${opened ? 'bg-forest/5' : 'bg-gold/5'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${opened ? 'bg-forest text-white' : 'bg-gold text-midnight'}`}>
                      {opened ? '✓' : '📄'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-midnight text-sm truncate">{doc.title || 'Training Document'}</p>
                      {!opened && <p className="text-xs text-charcoal/50">Open to unlock questions below</p>}
                      {opened && <p className="text-xs text-forest">Document opened</p>}
                    </div>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      onClick={() => setOpenedDocs((s) => new Set([...s, doc.id]))}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 ${opened ? 'bg-forest/10 text-forest hover:bg-forest/20' : 'bg-gold text-midnight hover:bg-yellow-400'}`}>
                      <ExternalLink size={12} /> {opened ? 'Re-read' : 'Open'}
                    </a>
                  </div>

                  {/* Questions for this doc */}
                  {groupQs.length > 0 && (
                    <div className="p-4 flex flex-col gap-3 bg-cream/20">
                      {groupQs.map((q) => {
                        const num = ++globalQIdx
                        return renderQuestion(q, num - 1, !opened)
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Ungrouped questions (no doc required) */}
            {ungroupedQs.length > 0 && (
              <div className="flex flex-col gap-3">
                {allDocs.length > 0 && (
                  <p className="text-xs text-charcoal/40 font-semibold uppercase tracking-wide px-1">General Questions</p>
                )}
                {ungroupedQs.map((q) => {
                  const num = ++globalQIdx
                  return renderQuestion(q, num - 1, false)
                })}
              </div>
            )}

            {/* No content case */}
            {allDocs.length === 0 && stage.questions.length === 0 && (
              <div className="text-center py-12 text-charcoal/40 bg-white rounded-2xl border border-gray-100">
                No content added to this stage yet.
              </div>
            )}
          </div>

          {!allDocsOpened && allDocs.length > 0 && (
            <p className="text-xs text-amber-600 text-center mt-4">
              Open all documents ({openedDocs.size}/{allDocs.length}) to enable submit
            </p>
          )}

          <Button
            onClick={submitQuiz}
            loading={submitting}
            disabled={!canSubmit}
            className="w-full mt-5"
            size="lg"
          >
            Submit Answers ({answeredCount}/{totalRequired})
          </Button>
        </div>
      )}

      {/* RESULT PHASE */}
      {phase === 'result' && result && (
        <div className="flex flex-col gap-5">
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

          <div className="flex gap-3">
            {!result.passed && result.attemptsRemaining > 0 ? (
              <Button onClick={() => { setAnswers({}); setTextAnswers({}); setOpenedDocs(new Set()); setPhase('quiz'); setResult(null); setTimedOut(false) }} className="flex-1">
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
