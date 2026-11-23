import { describe, expect, it } from 'vitest'

describe('escapeHtml', () => {
  it('neutralises markup in names before they go into emails', async () => {
    const { escapeHtml } = await import('@/lib/email')
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
    expect(escapeHtml("O'Brien & Co")).toBe('O&#39;Brien &amp; Co')
    expect(escapeHtml(null)).toBe('')
  })
})
