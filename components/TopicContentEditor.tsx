'use client'

import { useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import { FileText, Video, Music, Link2, Upload, Trash2, Loader2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react'

export interface ContentBlock { id?: string; type: string; title: string; url: string; order: number }

const TYPE_META: Record<string, { label: string; icon: typeof FileText }> = {
  PDF: { label: 'Document', icon: FileText },
  VIDEO_UPLOAD: { label: 'Video', icon: Video },
  VIDEO_LINK: { label: 'Video link', icon: Video },
  AUDIO: { label: 'Audio', icon: Music },
  LINK: { label: 'Link', icon: Link2 },
}

export default function TopicContentEditor({ testId, blocks, onChange }: {
  testId: string
  blocks: ContentBlock[]
  onChange: (blocks: ContentBlock[]) => void
}) {
  const docRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [videoLinkTitle, setVideoLinkTitle] = useState('')
  const [videoLinkUrl, setVideoLinkUrl] = useState('')

  function add(block: ContentBlock) {
    onChange([...blocks, { ...block, order: blocks.length }])
  }

  function remove(idx: number) {
    onChange(blocks.filter((_, i) => i !== idx).map((b, i) => ({ ...b, order: i })))
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...blocks]
    const j = idx + dir
    if (j < 0 || j >= next.length) return
    ;[next[idx], next[j]] = [next[j], next[idx]]
    onChange(next.map((b, i) => ({ ...b, order: i })))
  }

  function updateTitle(idx: number, title: string) {
    onChange(blocks.map((b, i) => i === idx ? { ...b, title } : b))
  }

  async function handleUpload(file: File, type: 'PDF' | 'VIDEO_UPLOAD' | 'AUDIO') {
    setError('')
    setUploading(type)
    try {
      const blob = await upload(`topic-content/${testId}/${Date.now()}-${file.name}`, file, {
        access: 'public',
        handleUploadUrl: `/api/student-tests/${testId}/content/upload`,
      })
      add({ type, title: file.name, url: blob.url, order: 0 })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(null)
    }
  }

  function addVideoLink() {
    if (!videoLinkUrl.trim()) return
    add({ type: 'VIDEO_LINK', title: videoLinkTitle.trim() || videoLinkUrl.trim(), url: videoLinkUrl.trim(), order: 0 })
    setVideoLinkTitle(''); setVideoLinkUrl('')
  }

  function addLink() {
    if (!linkUrl.trim()) return
    add({ type: 'LINK', title: linkTitle.trim() || linkUrl.trim(), url: linkUrl.trim(), order: 0 })
    setLinkTitle(''); setLinkUrl('')
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
      <h2 className="text-sm font-bold text-midnight mb-1">Study Materials</h2>
      <p className="text-xs text-charcoal/50 mb-4">Shown to the student before the quiz questions below. Upload a book/PDF, a video, audio, or link out to something else.</p>

      {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{error}</p>}

      {blocks.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {blocks.map((b, idx) => {
            const meta = TYPE_META[b.type] ?? TYPE_META.LINK
            const Icon = meta.icon
            return (
              <div key={b.id ?? `${b.url}-${idx}`} className="flex items-center gap-2 p-3 border border-gray-100 rounded-xl">
                <GripVertical size={14} className="text-charcoal/20 flex-shrink-0" />
                <Icon size={15} className="text-midnight/60 flex-shrink-0" />
                <input value={b.title} onChange={(e) => updateTitle(idx, e.target.value)}
                  className="flex-1 min-w-0 text-sm text-charcoal px-2 py-1 border border-transparent hover:border-gray-200 focus:border-gray-300 rounded-lg focus:outline-none" />
                <span className="text-xs text-charcoal/40 flex-shrink-0">{meta.label}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1 text-charcoal/30 hover:text-midnight disabled:opacity-20"><ArrowUp size={13} /></button>
                  <button type="button" onClick={() => move(idx, 1)} disabled={idx === blocks.length - 1} className="p-1 text-charcoal/30 hover:text-midnight disabled:opacity-20"><ArrowDown size={13} /></button>
                  <button type="button" onClick={() => remove(idx)} className="p-1 text-charcoal/30 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        <input ref={docRef} type="file" accept="application/pdf,.doc,.docx" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'PDF'); e.target.value = '' }} />
        <button type="button" onClick={() => docRef.current?.click()} disabled={!!uploading}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 text-charcoal hover:border-midnight/30 disabled:opacity-50">
          {uploading === 'PDF' ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} PDF / Doc
        </button>

        <input ref={videoRef} type="file" accept="video/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'VIDEO_UPLOAD'); e.target.value = '' }} />
        <button type="button" onClick={() => videoRef.current?.click()} disabled={!!uploading}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 text-charcoal hover:border-midnight/30 disabled:opacity-50">
          {uploading === 'VIDEO_UPLOAD' ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Upload Video
        </button>

        <input ref={audioRef} type="file" accept="audio/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'AUDIO'); e.target.value = '' }} />
        <button type="button" onClick={() => audioRef.current?.click()} disabled={!!uploading}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 text-charcoal hover:border-midnight/30 disabled:opacity-50">
          {uploading === 'AUDIO' ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Audio
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-charcoal/60">Video link (YouTube, etc.)</label>
          <div className="flex gap-1.5">
            <input value={videoLinkTitle} onChange={(e) => setVideoLinkTitle(e.target.value)} placeholder="Title"
              className="w-24 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-midnight" />
            <input value={videoLinkUrl} onChange={(e) => setVideoLinkUrl(e.target.value)} placeholder="https://youtube.com/…"
              className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-midnight" />
            <button type="button" onClick={addVideoLink} className="px-3 py-1.5 bg-midnight text-white text-xs font-semibold rounded-lg">Add</button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-charcoal/60">External link</label>
          <div className="flex gap-1.5">
            <input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Title"
              className="w-24 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-midnight" />
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…"
              className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-midnight" />
            <button type="button" onClick={addLink} className="px-3 py-1.5 bg-midnight text-white text-xs font-semibold rounded-lg">Add</button>
          </div>
        </div>
      </div>
    </div>
  )
}
