'use client'

// Client-side only — PDF rendering and OCR both run in the browser, nothing
// is uploaded to a server. Typed PDFs go through pdfjs-dist text extraction
// (fast, exact). Scanned PDFs and photo uploads fall back to Tesseract OCR,
// run on the whole page/image at once.

export interface ExtractedOption { id: string; text: string }
export interface ExtractedQuestion {
  id?: string
  type: string
  text: string
  imageUrl: string | null
  videoUrl: string | null
  options: ExtractedOption[]
  correctId: string
  explanation: string | null
  order: number
  marks: number
  // extraction-only metadata, stripped before saving
  answerDetected: boolean
}

function newOpt(text: string): ExtractedOption {
  return { id: crypto.randomUUID(), text: text.trim() }
}

// A typed PDF yields real text per page; a scanned one yields almost nothing.
const MIN_CHARS_PER_PAGE_FOR_TEXT = 25

async function extractTextFromPdf(file: File): Promise<{ text: string; needsOcr: boolean; pdf: unknown }> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise

  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((item) => ('str' in item ? item.str : '')).join(' ') + '\n'
  }

  const needsOcr = text.trim().length < pdf.numPages * MIN_CHARS_PER_PAGE_FOR_TEXT
  return { text, needsOcr, pdf }
}

async function ocrPdf(pdf: unknown, onProgress?: (msg: string) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')
  let text = ''
  const doc = pdf as { numPages: number; getPage: (n: number) => Promise<{ getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> } }> }
  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.(`Reading page ${i} of ${doc.numPages} (scanned document — this takes a bit)…`)
    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport }).promise
    const { data } = await worker.recognize(canvas)
    text += data.text + '\n'
  }
  await worker.terminate()
  return text
}

async function ocrImage(file: File, onProgress?: (msg: string) => void): Promise<string> {
  onProgress?.('Reading image (OCR)…')
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')
  const { data } = await worker.recognize(file)
  await worker.terminate()
  return data.text
}

export async function extractRawText(file: File, onProgress?: (msg: string) => void): Promise<string> {
  if (file.type === 'application/pdf') {
    onProgress?.('Reading PDF text…')
    const { text, needsOcr, pdf } = await extractTextFromPdf(file)
    if (!needsOcr) return text
    return ocrPdf(pdf, onProgress)
  }
  if (file.type.startsWith('image/')) {
    return ocrImage(file, onProgress)
  }
  throw new Error('Unsupported file type — upload a PDF or an image (JPG/PNG).')
}

// Best-effort structural parse: numbered questions ("1." / "Q1)"), lettered
// options ("A." / "a)"), and an answer marker either inline ("Answer: B") or
// in a trailing answer-key block ("1-B, 2-C" or "1. B\n2. C"). Anything it
// can't confidently match for the correct answer is left unanswered and
// flagged — never guesses, so a wrong answer never slips into a real test.
export function parseQuestionsFromText(text: string): ExtractedQuestion[] {
  const normalized = text.replace(/\r/g, '')

  // Pull a trailing "Answer Key" section out, if present, before splitting
  // into questions — otherwise it gets misparsed as more question blocks.
  let body = normalized
  const answerKeyMatch = normalized.match(/answer\s*key[:\s]*([\s\S]*)$/i)
  const answerKeyMap = new Map<number, string>()
  if (answerKeyMatch) {
    body = normalized.slice(0, answerKeyMatch.index).trim()
    const keyText = answerKeyMatch[1]
    // "1-B, 2-C, 3-A" or "1) B  2) C" or "1. B\n2. C" style keys
    const pairRe = /(\d{1,3})\s*[-.\):]\s*([A-Da-d])\b/g
    let m: RegExpExecArray | null
    while ((m = pairRe.exec(keyText))) answerKeyMap.set(parseInt(m[1], 10), m[2].toUpperCase())
  }

  // Split on a numbered-question start at the beginning of a line.
  const blocks = body.split(/\n(?=\s*\d{1,3}[\.\)]\s+)/).map((b) => b.trim()).filter(Boolean)

  const questions: ExtractedQuestion[] = []
  let order = 0
  for (const block of blocks) {
    const numMatch = block.match(/^\s*(\d{1,3})[\.\)]\s*/)
    if (!numMatch) continue
    const qNum = parseInt(numMatch[1], 10)
    const rest = block.slice(numMatch[0].length)

    // Split the block into question text vs. option lines
    const lines = rest.split('\n').map((l) => l.trim()).filter(Boolean)
    const optionRe = /^([A-Da-d])[\.\)]\s*(.+)$/
    const questionLines: string[] = []
    const rawOptions: { letter: string; text: string }[] = []
    let inlineAnswerLetter: string | null = null

    for (const line of lines) {
      const ansInline = line.match(/^answer\s*[:\-]?\s*([A-Da-d])\b/i)
      if (ansInline) { inlineAnswerLetter = ansInline[1].toUpperCase(); continue }
      const optMatch = line.match(optionRe)
      if (optMatch) {
        rawOptions.push({ letter: optMatch[1].toUpperCase(), text: optMatch[2] })
      } else if (rawOptions.length === 0) {
        questionLines.push(line)
      }
    }

    const questionText = questionLines.join(' ').trim()
    if (!questionText) continue

    const options = rawOptions.map((o) => newOpt(o.text))
    const answerLetter = inlineAnswerLetter ?? answerKeyMap.get(qNum) ?? null
    const answerIdx = answerLetter ? answerLetter.charCodeAt(0) - 'A'.charCodeAt(0) : -1
    const correctId = answerIdx >= 0 && options[answerIdx] ? options[answerIdx].id : ''

    // Pad to at least 2 options so it's a usable MCQ shape even if parsing
    // only found a partial option list — admin can fix up in the preview.
    while (options.length > 0 && options.length < 2) options.push(newOpt(''))

    questions.push({
      type: 'MCQ',
      text: questionText,
      imageUrl: null,
      videoUrl: null,
      options,
      correctId,
      explanation: null,
      order: order++,
      marks: 1,
      answerDetected: !!correctId,
    })
  }

  return questions
}
