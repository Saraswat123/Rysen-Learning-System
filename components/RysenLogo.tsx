'use client'

import { useState } from 'react'

const imgSizes = { sm: 'h-8', md: 'h-10', lg: 'h-14' }
const textSizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' }

export default function RysenLogo({ size = 'md', light = false }: { size?: 'sm' | 'md' | 'lg'; light?: boolean }) {
  const [imgFailed, setImgFailed] = useState(false)

  if (!imgFailed) {
    return (
      <img
        src="/rysen-logo.png"
        alt="RYSEN Group of Schools"
        className={`${imgSizes[size]} w-auto object-contain ${light ? 'brightness-0 invert' : ''}`}
        onError={() => setImgFailed(true)}
      />
    )
  }

  // Text fallback when no logo image found
  const color = light ? 'text-white' : 'text-midnight'
  return (
    <div className={`font-bold tracking-widest ${textSizes[size]} ${color} select-none`}>
      <span>RYSEN</span>
      <div className={`text-xs font-medium tracking-wider text-gold -mt-1`}>
        {size !== 'sm' && 'LEARNING CENTRE'}
      </div>
    </div>
  )
}
