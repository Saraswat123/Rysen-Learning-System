'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, CheckCircle, XCircle, ArrowLeft, Clock, ChevronRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import MCQTimer from '@/components/MCQTimer'

interface Option { id: string; text: string }
interface Question { id: string; type: 'MCQ' | 'TEXT'; text: string; options: Option[]; explanation?: string; docGroupId?: string | null }
interface StageDoc { id: string; title: string; url: string; weekId?: string | null; order: number }
interface StageWeek { id: string; label: string; order: number }
interface Stage {
  id: string; number: number; title: string; subtitle: string
  docUrl: string | null; docs: StageDoc[]; weeks: StageWeek[]
  timeLimitMinutes: number; passScore: number
  maxAttempts: number; badgeTitle: string | null; badgeColor: string
  questions: Question[]
  progress: { passed: boolean; attempts: number; bestScore: number | null; docRead: boolean } | null
}
interface MCQResult {
  score: number; passed: boolean; correct: number; total: number
  attemptsUsed: number; attemptsRemaining: number
  results: { questionId: string; isCorrect: boolean; correct: string; explanation?: string }[]
}
interface Group { doc: StageDoc | null; weekLabel: string | null; questions: Question[] }

function buildGroups(stage: Stage): Group[] {
  const weeks = [...(stage.weeks ?? [])].sort((a, b) => a.order - b.order)
  const docs = stage.docs ?? []
  const groups: Group[] = []
  for (const week of weeks) {
    const weekDocs = docs.filter((d) => d.weekId === week.id).sort((a, b) => a.order - b.order)
    for (const doc of weekDocs) {
      groups.push({ doc, weekLabel: week.label, questions: stage.questions.filter((q) => q.docGroupId === doc.id) })
    }
  }
  const ungroupedDocs = docs.filter((d) => !d.weekId || !weeks.find((w) => w.id === d.weekId))
  for (const doc of ungroupedDocs) {
    groups.push({ doc, weekLabel: null, questions: stage.questions.filter((q) => q.docGroupId === doc.id) })
  }
  if (groups.length === 0 && stage.docUrl) {
    groups.push({ doc: { id: 'legacy', title: 'Training Document', url: stage.docUrl, order: 0 }, weekLabel: null, questions: stage.questions.filter((q) => !q.docGroupId) })
  }
  const ungroupedQs = stage.questions.filter((q) => !q.docGroupId || !docs.find((d) => d.id === q.docGroupId))
  if (ungroupedQs.length > 0) groups.push({ doc: null, weekLabel: null, questions: ungroupedQs })
  return groups
}

export default function PrincipalStagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [stage, setStage] = useState<Stage | null>(null)
  const [phase, setPhase] = useState<'quiz' | 'result'>('quiz')
  const [currentGroupIdx, setCurrentGroupIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({})
  const [openedDocs, setOpenedDocs] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<MCQResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    fetch(`/api/stages/${id}`).then((r) => r.json()).then(setStage)
  }, [id])

  const handleTimeout = useCallback(() => {
    setTimedOut(true)
    submitQuiz()
  }, [answers]) // eslint-disable-line

  async function submitQuiz() {
    if (!stage) return
    setSubmitting(true)
    await fetch('/api/progress/doc-read', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stageId: id }),
    })
    const res = await fetch(`/api/mcq/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, textAnswers }),
    })
    setResult(await res.json())
    setPhase('result')
    setSubmitting(false)
  }

  if (!stage) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-olive border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const groups = buildGroups(stage)
  const currentGroup = groups[currentGroupIdx] ?? null
  const isLastGroup = currentGroupIdx === groups.length - 1
  const currentDoc = currentGroup?.doc ?? null
  const docOpened = !currentDoc || openedDocs.has(currentDoc.id)
  const currentQs = currentGroup?.questions ?? []
  const currentMCQs = currentQs.filter((q) => q.type === 'MCQ')
  const currentTexts = currentQs.filter((q) => q.type === 'TEXT')
  const currentAnswered = currentMCQs.filter((q) => answers[q.id]).length + currentTexts.filter((q) => (textAnswers[q.id] ?? '').trim().length > 0).length
  const currentComplete = docOpened && currentAnswered >= currentQs.length
  const globalQBase = groups.slice(0, currentGroupIdx).reduce((acc, g) => acc + g.questions.length, 0)

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.push('/principal/dashboard')} className="flex items-center gap-2 text-sm text-charcoal/60 hover:text-midnight mb-6">
        <ArrowLeft size={16} /> Back to Journey
      </button>

      <div className="rounded-2xl p-6 mb-4 text-white" style={{ backgroundColor: stage.badgeColor === '#FECB08' ? '#7D783E' : stage.badgeColor }}>
        <div className="text-gold text-sm font-medium mb-1">Stage {stage.number}</div>
        <h1 className="text-2xl font-bold">{stage.title}</h1>
        <p className="text-white/70 text-sm mt-1">{stage.subtitle}</p>
      </div>

      {phase === 'quiz' && (
        <div>
          {groups.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  {currentGroup?.weekLabel && <p className="text-xs font-semibold text-charcoal/40 uppercase tracking-wide mb-0.5">{currentGroup.weekLabel}</p>}
                  <p className="text-sm font-semibold text-midnight">Step {currentGroupIdx + 1} of {groups.length}</p>
                </div>
                <MCQTimer minutes={stage.timeLimitMinutes} onExpire={handleTimeout} />
              </div>
              <div className="flex gap-1 mt-2">
                {groups.map((_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < currentGroupIdx ? 'bg-olive' : i === currentGroupIdx ? 'bg-gold' : 'bg-gray-100'}`} />
                ))}
              </div>
            </div>
          )}

          {timedOut && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 mb-4 flex items-center gap-2">
              <Clock size={16} /> Time&apos;s up! Answers submitted automatically.
            </div>
          )}

          {currentGroup && (
            <div className="flex flex-col gap-4">
              {currentDoc && (
                <div className={`rounded-2xl border-2 p-4 transition-all ${docOpened ? 'border-olive/40 bg-olive/5' : 'border-gold/40 bg-gold/5'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${docOpened ? 'bg-olive text-white' : 'bg-gold text-midnight'}`}>
                      {docOpened ? '✓' : '📄'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-midnight text-sm truncate">{currentDoc.title || 'Training Document'}</p>
                      <p className={`text-xs ${docOpened ? 'text-olive' : 'text-charcoal/50'}`}>
                        {docOpened ? 'Opened — scroll down to answer questions' : 'Open document to unlock questions below'}
                      </p>
                    </div>
                    <a href={currentDoc.url} target="_blank" rel="noopener noreferrer"
                      onClick={() => setOpenedDocs((s) => new Set([...s, currentDoc.id]))}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-colors flex-shrink-0 ${docOpened ? 'bg-olive/10 text-olive hover:bg-olive/20' : 'bg-gold text-midnight hover:bg-yellow-400'}`}>
                      <ExternalLink size={13} /> {docOpened ? 'Re-read' : 'Open Doc'}
                    </a>
                  </div>
                </div>
              )}

              {currentQs.length > 0 && (
                <div className={`flex flex-col gap-3 transition-all ${!docOpened && currentDoc ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                  {currentQs.map((q, qi) => (
                    <div key={q.id} className={`bg-white rounded-xl border p-5 ${q.type === 'TEXT' ? 'border-olive/30' : 'border-gray-100'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gold/20 text-midnight">Q{globalQBase + qi + 1}</span>
                        {q.type === 'TEXT' && <span className="text-xs px-2 py-0.5 rounded-full bg-olive/20 text-olive font-medium">Reflective</span>}
                      </div>
                      <p className="font-semibold text-midnight mb-4 text-sm leading-relaxed">{q.text}</p>
                      {q.type === 'MCQ' ? (
                        <div className="flex flex-col gap-2">
                          {q.options.map((opt) => (
                            <button key={opt.id} onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.id }))}
                              className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${answers[q.id] === opt.id ? 'border-olive bg-olive text-white' : 'border-gray-200 hover:border-olive/40 hover:bg-cream/50'}`}>
                              {opt.text}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div>
                          {q.explanation && <p className="text-xs text-olive/70 italic mb-2">{q.explanation}</p>}
                          <textarea placeholder="Write your response here..." value={textAnswers[q.id] ?? ''}
                            onChange={(e) => setTextAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                            rows={4} className="w-full px-4 py-3 border border-olive/30 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-olive/50 bg-olive/5" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2">
                {!currentComplete && currentDoc && !docOpened && <p className="text-xs text-amber-600 text-center mb-3">Open the document above to unlock questions</p>}
                {!currentComplete && docOpened && currentQs.length > 0 && <p className="text-xs text-charcoal/40 text-center mb-3">Answer all questions ({currentAnswered}/{currentQs.length}) to continue</p>}
                {isLastGroup ? (
                  <Button onClick={submitQuiz} loading={submitting} disabled={!currentComplete} className="w-full" size="lg">Submit All Answers</Button>
                ) : (
                  <Button onClick={() => setCurrentGroupIdx((i) => i + 1)} disabled={!currentComplete} className="w-full" size="lg">
                    Next <ChevronRight size={18} />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'result' && result && (
        <div className="flex flex-col gap-5">
          <div className={`rounded-2xl p-8 text-center ${result.passed ? 'bg-olive text-white' : 'bg-charcoal text-white'}`}>
            {result.passed ? (
              <><CheckCircle size={48} className="mx-auto mb-3 text-gold" /><h2 className="text-2xl font-bold mb-1">Congratulations! 🎉</h2><p className="text-white/80 mb-4">You passed Stage {stage.number}!</p></>
            ) : (
              <><XCircle size={48} className="mx-auto mb-3 text-red-400" /><h2 className="text-2xl font-bold mb-1">Not Passed</h2><p className="text-white/80 mb-4">Keep trying!</p></>
            )}
            <div className="text-5xl font-bold mb-2">{result.score}%</div>
            <p className="text-white/60 text-sm">{result.correct}/{result.total} correct</p>
            {!result.passed && result.attemptsRemaining > 0 && <p className="text-white/60 text-sm mt-1">{result.attemptsRemaining} attempts remaining</p>}
          </div>
          <div className="flex gap-3">
            {!result.passed && result.attemptsRemaining > 0 && (
              <Button onClick={() => { setAnswers({}); setTextAnswers({}); setOpenedDocs(new Set()); setCurrentGroupIdx(0); setPhase('quiz'); setResult(null); setTimedOut(false) }} className="flex-1">Try Again</Button>
            )}
            <Button onClick={() => router.push('/principal/dashboard')} variant={result.passed ? 'primary' : 'ghost'} className="flex-1">
              {result.passed ? 'Continue Journey →' : 'Back to Dashboard'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
