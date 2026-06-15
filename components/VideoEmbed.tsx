'use client'

import { useState } from 'react'
import { Play, CheckCircle } from 'lucide-react'

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/shorts\/|\/live\/))([^?&\n#/]+)/)
  return m?.[1] ?? null
}

interface VideoEmbedProps {
  url: string
  title: string
  onWatched: () => void
  watched: boolean
  accentColor?: string // tailwind bg class e.g. 'bg-midnight'
}

export default function VideoEmbed({ url, title, onWatched, watched, accentColor = 'bg-midnight' }: VideoEmbedProps) {
  const [started, setStarted] = useState(false)
  const ytId = getYouTubeId(url)

  function handlePlay() {
    setStarted(true)
    // Auto-mark watched when they start the video
    if (!watched) onWatched()
  }

  if (!url) return (
    <div className="rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center text-sm text-charcoal/40">
      No video URL set
    </div>
  )

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${watched ? 'border-forest/30' : 'border-forest/50'}`}>
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3 ${watched ? 'bg-forest/8' : 'bg-forest/5'} border-b border-forest/20`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${watched ? 'bg-forest text-white' : 'bg-forest/20 text-forest'}`}>
          {watched ? <CheckCircle size={16} /> : <Play size={14} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-midnight text-sm truncate">{title || 'Training Video'}</p>
          <p className={`text-xs ${watched ? 'text-forest' : 'text-charcoal/50'}`}>
            {watched ? 'Watched — answer questions below' : 'Watch video to unlock questions'}
          </p>
        </div>
      </div>

      {/* Player */}
      <div className="bg-black">
        {ytId ? (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${ytId}?rel=0&enablejsapi=1`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => {}}
            />
            {/* Overlay to detect first click/play for YouTube */}
            {!started && (
              <button
                onClick={handlePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors"
                aria-label="Play video"
              >
                <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-xl">
                  <Play size={28} className="text-white ml-1" fill="white" />
                </div>
              </button>
            )}
          </div>
        ) : (
          <video
            src={url}
            controls
            className="w-full max-h-80"
            onPlay={handlePlay}
          />
        )}
      </div>

      {/* Mark watched button (fallback for YouTube after overlay dismissed) */}
      {!watched && started && ytId && (
        <div className="px-4 py-3 bg-forest/5 border-t border-forest/20 flex items-center justify-between">
          <p className="text-xs text-charcoal/50">Finished watching?</p>
          <button onClick={onWatched}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-forest text-white rounded-lg hover:bg-forest/90 transition-colors">
            <CheckCircle size={13} /> Mark as Watched
          </button>
        </div>
      )}
    </div>
  )
}
