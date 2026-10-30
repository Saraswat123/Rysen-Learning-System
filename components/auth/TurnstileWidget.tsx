'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; 'expired-callback'?: () => void }) => string
      remove: (id: string) => void
    }
  }
}

// Renders nothing if NEXT_PUBLIC_TURNSTILE_SITE_KEY isn't set — lets login keep
// working before the key is configured, same no-op pairing as lib/turnstile.ts.
export default function TurnstileWidget({ onVerify }: { onVerify: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  useEffect(() => {
    if (!siteKey) return
    if (window.turnstile) { setScriptLoaded(true); return }
    const existing = document.querySelector('script[src*="turnstile"]')
    if (existing) {
      existing.addEventListener('load', () => setScriptLoaded(true))
      return
    }
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.onload = () => setScriptLoaded(true)
    document.head.appendChild(script)
  }, [siteKey])

  useEffect(() => {
    if (!siteKey || !scriptLoaded || !containerRef.current || !window.turnstile) return
    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      'expired-callback': () => onVerify(''),
    })
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current)
    }
  }, [scriptLoaded, siteKey, onVerify])

  if (!siteKey) return null
  return <div ref={containerRef} className="flex justify-center my-1" />
}
