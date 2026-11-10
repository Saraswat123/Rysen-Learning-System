'use client'

import { useEffect, useRef } from 'react'

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
  useEffect(() => {
    if (!siteKey) return
    let cancelled = false
    const render = () => {
      if (cancelled || widgetId.current || !containerRef.current || !window.turnstile) return
      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onVerify,
        'expired-callback': () => onVerify(''),
      })
    }

    let script: HTMLScriptElement | null = null
    if (window.turnstile) {
      render()
    } else {
      script = document.querySelector<HTMLScriptElement>('script[src*="turnstile"]')
      if (!script) {
        script = document.createElement('script')
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
        script.async = true
        document.head.appendChild(script)
      }
      script.addEventListener('load', render)
    }

    return () => {
      cancelled = true
      script?.removeEventListener('load', render)
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current)
      widgetId.current = null
    }
  }, [siteKey, onVerify])

  if (!siteKey) return null
  return <div ref={containerRef} className="flex justify-center my-1" />
}
