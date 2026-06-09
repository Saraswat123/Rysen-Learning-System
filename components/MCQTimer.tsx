'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

export default function MCQTimer({ minutes, onExpire }: { minutes: number; onExpire: () => void }) {
  const [seconds, setSeconds] = useState(minutes * 60)

  useEffect(() => {
    if (seconds <= 0) { onExpire(); return }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds, onExpire])

  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  const isWarning = seconds < 120

  return (
    <div className={`flex items-center gap-1.5 font-mono text-sm font-bold px-3 py-1.5 rounded-full ${isWarning ? 'bg-red-100 text-red-700' : 'bg-midnight/10 text-midnight'}`}>
      <Clock size={14} />
      {m}:{s.toString().padStart(2, '0')}
    </div>
  )
}
