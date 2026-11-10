import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Call = { method: string; url: string; body?: unknown }
let calls: Call[]
let failOn: ((c: Call) => boolean) | null

beforeEach(() => {
  vi.resetModules()
  calls = []
  failOn = null
  Object.assign(process.env, { GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 's', GOOGLE_REFRESH_TOKEN: 'r', GOOGLE_SHEETS_ID: 'sheet1' })
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    if (url.includes('oauth2')) return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }))
    const call = { method: init.method ?? 'GET', url: decodeURIComponent(url), body: init.body ? JSON.parse(String(init.body)) : undefined }
    calls.push(call)
    if (failOn?.(call)) return new Response('quota exceeded', { status: 429 })
    if (call.url.includes('F:F')) return new Response(JSON.stringify({ values: [['Student ID'], ['stu_9'], ['stu_2'], ['stu_7']] }))
    return new Response(JSON.stringify({ values: [['Branch'], ['row1'], ['row2']] }))
  }))
})
afterEach(() => vi.unstubAllGlobals())

describe('google sheets sync', () => {
  it('headers have one column per data cell (14, Student ID in F)', async () => {
    const { HEADERS } = await import('@/lib/google-sheets')
    expect(HEADERS).toHaveLength(14)
    expect(HEADERS[5]).toBe('Student ID')
    expect(HEADERS.slice(7)).toEqual(['Total Tests', 'Tests Passed', 'Avg Score%', 'Last Test', 'Last Score%', 'Last Result', 'Last Date'])
  })

  it('writes the new rows before clearing the leftover tail', async () => {
    const { syncAllStudents } = await import('@/lib/google-sheets')
    await syncAllStudents([['A', 'Asha'], ['A', 'Ravi']])
    expect(calls.map((c) => c.method)).toEqual(['PUT', 'POST'])
    expect(calls[0].url).toContain('Sheet1!A1:N3')
    expect(calls[1].url).toContain('Sheet1!A4:N:clear')
  })

  it('a failed write throws and never clears the sheet (no empty-sheet data loss)', async () => {
    failOn = (c) => c.method === 'PUT'
    const { syncAllStudents } = await import('@/lib/google-sheets')
    await expect(syncAllStudents([['A', 'Asha']])).rejects.toThrow(/429/)
    expect(calls.some((c) => c.url.includes(':clear'))).toBe(false)
  })

  it('updates the row matching the student id, not the first same-name row', async () => {
    const { updateStudentRow } = await import('@/lib/google-sheets')
    await updateStudentRow('stu_2', { totalTests: 3, testsPassed: 2, avgScore: 70, lastTestTitle: 'T', lastScore: 80, lastPassed: true, lastDate: '10/11/2026' })
    const put = calls.find((c) => c.method === 'PUT')!
    expect(put.url).toContain('Sheet1!H3:N3')
    expect(put.body).toEqual({ values: [[3, 2, 70, 'T', 80, 'Passed', '10/11/2026']] })
  })

  it('readSheet drops only the header row', async () => {
    const { readSheet } = await import('@/lib/google-sheets')
    expect(await readSheet()).toEqual([['row1'], ['row2']])
  })
})
