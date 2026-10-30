'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, AlertTriangle, CheckCircle2, X, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { extractRawText, parseQuestionsFromText, type ExtractedQuestion } from '@/lib/question-extractor'

interface Option { id: string; text: string }
interface Question {
  id?: string; type: string; text: string
  imageUrl: string | null; videoUrl: string | null
  options: Option[]; correctId: string; explanation: string | null
  order: number; marks: number
}

export default function QuestionPdfImport({ onImport }: { onImport: (questions: Question[]) => void }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'processing' | 'preview' | 'error'>('idle')
  const [progressMsg, setProgressMsg] = useState('')
  const [parsed, setParsed] = useState<ExtractedQuestion[]>([])
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStatus('idle'); setParsed([]); setError(''); setProgressMsg('')
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('processing')
    setError('')
    try {
      const text = await extractRawText(file, setProgressMsg)
      const questions = parseQuestionsFromText(text)
      if (questions.length === 0) {
        setError('No numbered questions found. Make sure questions are numbered like "1.", "2." and options are lettered "A.", "B.", etc.')
        setStatus('error')
        return
      }
      setParsed(questions)
      setStatus('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function updateText(idx: number, text: string) {
    setParsed((prev) => prev.map((q, i) => i === idx ? { ...q, text } : q))
  }
  function removeQuestion(idx: number) {
    setParsed((prev) => prev.filter((_, i) => i !== idx))
  }
  function setManualAnswer(idx: number, optionId: string) {
    setParsed((prev) => prev.map((q, i) => i === idx ? { ...q, correctId: optionId, answerDetected: true } : q))
  }

  function confirmImport() {
    onImport(parsed.map(({ answerDetected, ...q }) => q))
    setOpen(false)
    reset()
  }

  const unansweredCount = parsed.filter((q) => !q.answerDetected).length

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-midnight/20 text-midnight hover:bg-midnight/5 transition-colors">
        <Upload size={13} /> Import from PDF
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-midnight flex items-center gap-2"><FileText size={18} /> Import Questions from PDF</h2>
              <button onClick={() => { setOpen(false); reset() }} className="text-charcoal/40 hover:text-charcoal p-1 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {status === 'idle' && (
                <div className="text-center py-10">
                  <Upload size={36} className="mx-auto mb-3 text-charcoal/20" />
                  <p className="text-sm text-charcoal/60 mb-1">Upload a question paper — typed or scanned PDF, or a photo (JPG/PNG).</p>
                  <p className="text-xs text-charcoal/40 mb-5">Number questions "1.", "2." and letter options "A.", "B.", "C.", "D." for best results. Put an answer key at the end ("1-B, 2-C…") or write "Answer: B" after each question.</p>
                  <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" onChange={handleFile} className="hidden" id="pdf-import-input" />
                  <label htmlFor="pdf-import-input" className="inline-flex items-center gap-2 px-5 py-2.5 bg-midnight text-white text-sm font-semibold rounded-xl cursor-pointer hover:bg-midnight/80 transition-colors">
                    <Upload size={15} /> Choose File
                  </label>
                </div>
              )}

              {status === 'processing' && (
                <div className="text-center py-16">
                  <Loader2 size={32} className="mx-auto mb-4 text-midnight animate-spin" />
                  <p className="text-sm text-charcoal/60">{progressMsg || 'Processing…'}</p>
                </div>
              )}

              {status === 'error' && (
                <div className="text-center py-10">
                  <AlertTriangle size={32} className="mx-auto mb-3 text-red-500" />
                  <p className="text-sm text-red-600 mb-5">{error}</p>
                  <Button onClick={reset}>Try Again</Button>
                </div>
              )}

              {status === 'preview' && (
                <div className="flex flex-col gap-4">
                  <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${unansweredCount > 0 ? 'bg-red-50 text-red-700' : 'bg-forest/10 text-forest'}`}>
                    {unansweredCount > 0
                      ? <><AlertTriangle size={15} /> {unansweredCount} question{unansweredCount !== 1 ? 's' : ''} have no detected answer — pick one below before importing, or they'll have no correct answer set.</>
                      : <><CheckCircle2 size={15} /> Found {parsed.length} questions, all with a detected answer.</>}
                  </div>

                  {parsed.map((q, idx) => (
                    <div key={idx} className={`rounded-xl border p-4 ${!q.answerDetected ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-charcoal/40 mt-1">Q{idx + 1}</span>
                        <button onClick={() => removeQuestion(idx)} className="text-charcoal/30 hover:text-red-500 p-1"><X size={14} /></button>
                      </div>
                      <textarea value={q.text} onChange={(e) => updateText(idx, e.target.value)} rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-midnight/20" />
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt) => (
                          <label key={opt.id} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border cursor-pointer ${q.correctId === opt.id ? 'border-forest bg-forest/5 text-forest font-semibold' : 'border-gray-100 text-charcoal/70'}`}>
                            <input type="radio" name={`ans-${idx}`} checked={q.correctId === opt.id} onChange={() => setManualAnswer(idx, opt.id)} className="accent-forest" />
                            {opt.text || <span className="text-charcoal/30 italic">empty</span>}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {status === 'preview' && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <button onClick={reset} className="text-xs text-charcoal/50 hover:text-midnight">Start over</button>
                <Button onClick={confirmImport} disabled={parsed.length === 0}>
                  Import {parsed.length} Question{parsed.length !== 1 ? 's' : ''}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
