'use client'

import { useState } from 'react'

const imgSizes = { sm: 'h-9', md: 'h-12', lg: 'h-16' }

export default function RysenLogo({ size = 'md', light = false }: { size?: 'sm' | 'md' | 'lg'; light?: boolean }) {
  const [imgFailed, setImgFailed] = useState(false)

  if (!imgFailed) {
    // On dark backgrounds (light=true), wrap in white rounded pill so teal+gold crest stays visible
    if (light) {
      return (
        <div className="inline-flex items-center bg-white rounded-xl px-2 py-1">
          <img
            src="/rysen-logo.png"
            alt="RYSEN Group of Schools"
            className={`${imgSizes[size]} w-auto object-contain`}
            onError={() => setImgFailed(true)}
          />
        </div>
      )
    }
    return (
      <img
        src="/rysen-logo.png"
        alt="RYSEN Group of Schools"
        className={`${imgSizes[size]} w-auto object-contain`}
        onError={() => setImgFailed(true)}
      />
    )
  }

  // Text fallback if image missing
  const textSizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' }
  const color = light ? 'text-white' : 'text-midnight'
  return (
    <div className={`font-bold tracking-widest ${textSizes[size]} ${color} select-none`}>
      <span>RYSEN</span>
      <div className="text-xs font-medium tracking-wider text-gold -mt-1">
        {size !== 'sm' && 'LEARNING CENTRE'}
      </div>
    </div>
  )
}
