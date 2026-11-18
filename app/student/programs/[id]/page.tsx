'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, ExternalLink, FileText, Play, Video } from 'lucide-react'

interface Program {
  id: string; title: string; description: string | null
  contentBlocks: { id: string; type: 'TEXT' | 'VIDEO'; title: string; body: string | null; url: string | null }[]
  tests: { id: string; title: string }[]
}

function youtubeEmbed(url: string): string | null {
  try {
    const parsed = new URL(url)
    let videoId = ''
    if (parsed.hostname === 'youtu.be') videoId = parsed.pathname.slice(1)
    if (parsed.hostname === 'youtube.com' || parsed.hostname === 'www.youtube.com') videoId = parsed.searchParams.get('v') ?? ''
    if (parsed.hostname === 'youtube.com' && parsed.pathname.startsWith('/embed/')) videoId = parsed.pathname.split('/')[2] ?? ''
    return /^[w-]{6,20}$/.test(videoId) ? `https://www.youtube-nocookie.com/embed/${videoId}` : null
  } catch { return null }
}

export default function StudentProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [program, setProgram] = useState<Program | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/student-programs/${id}?student=true`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setProgram(data))
      .catch(() => setProgram(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="py-16 text-center text-charcoal/50">Loading program…</div>
  if (!program) return <div className="py-16 text-center text-charcoal/50">Program not found or not available for your class.</div>

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/student/programs" className="inline-flex items-center gap-2 text-sm text-charcoal/60 hover:text-midnight mb-5"><ArrowLeft size={16} /> Learning Programs</Link>
      <h1 className="text-2xl font-bold text-midnight">{program.title}</h1>
      {program.description && <p className="text-sm text-charcoal/60 mt-2 mb-6">{program.description}</p>}

      <section className="mt-6">
        <h2 className="text-lg font-bold text-midnight flex items-center gap-2 mb-3"><BookOpen size={18} /> Lessons</h2>
        {program.contentBlocks.length === 0 ? <p className="text-sm text-charcoal/50">No lessons have been added yet.</p> : (
          <div className="grid gap-4">
            {program.contentBlocks.map((block) => (
              <article key={block.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-semibold text-midnight flex items-center gap-2 mb-3">
                  {block.type === 'TEXT' ? <FileText size={16} /> : <Video size={16} />}{block.title}
                </h3>
                {block.type === 'TEXT' && <p className="text-sm text-charcoal/80 leading-relaxed whitespace-pre-wrap">{block.body}</p>}
                {block.type === 'VIDEO' && block.url && (youtubeEmbed(block.url) ? (
                  <iframe title={block.title} src={youtubeEmbed(block.url)!} className="w-full aspect-video rounded-xl" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
                ) : (
                  <a href={block.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-midnight hover:underline"><ExternalLink size={14} /> Watch video</a>
                ))}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-midnight flex items-center gap-2 mb-3"><Play size={18} /> Tests</h2>
        {program.tests.length === 0 ? <p className="text-sm text-charcoal/50">No tests are currently available in this program.</p> : (
          <div className="grid gap-3">
            {program.tests.map((test) => <Link key={test.id} href={`/student/test/${test.id}`} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between hover:border-midnight/30"><span className="font-medium text-midnight">{test.title}</span><span className="text-sm text-midnight">Start test →</span></Link>)}
          </div>
        )}
      </section>
    </div>
  )
}
