// Google Sheets via OAuth2 refresh token (client_secret JSON + one-time auth flow)
// Required env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_SHEETS_ID

// Column F carries the student id so per-attempt updates match the exact row,
// not the first student who happens to share a name at the same campus.
export const HEADERS = [
  'Branch', 'Name', 'Class', 'Section', 'Subject', 'Student ID', 'Status',
  'Total Tests', 'Tests Passed', 'Avg Score%', 'Last Test', 'Last Score%', 'Last Result', 'Last Date',
]
const LAST_COLUMN = 'N'

const SHEET_ID = process.env.GOOGLE_SHEETS_ID ?? ''
const API = 'https://sheets.googleapis.com/v4/spreadsheets'

export function sheetsEnabled() {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN &&
    SHEET_ID
  )
}

let cachedToken: { value: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json().catch(() => ({})) as { access_token?: string; expires_in?: number; error?: string }
  if (!res.ok || !data.access_token) throw new Error(`Google token error: ${data.error ?? res.status}`)
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 }
  return data.access_token
}

async function sheetsRequest(path: string, init: RequestInit = {}) {
  const token = await getAccessToken()
  const res = await fetch(`${API}/${SHEET_ID}/values/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Sheets API ${res.status}: ${detail.slice(0, 200)}`)
  }
  return res.json().catch(() => ({}))
}

async function sheetsGet(range: string): Promise<string[][]> {
  const data = await sheetsRequest(encodeURIComponent(range)) as { values?: string[][] }
  return data.values ?? []
}

async function sheetsPut(range: string, values: (string | number)[][]) {
  await sheetsRequest(`${encodeURIComponent(range)}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values }),
  })
}

async function sheetsClear(range: string) {
  await sheetsRequest(`${encodeURIComponent(range)}:clear`, { method: 'POST' })
}

/** Data rows only (header row removed). */
export async function readSheet(): Promise<string[][]> {
  const rows = await sheetsGet(`Sheet1!A:${LAST_COLUMN}`)
  return rows.slice(1)
}

/**
 * Write-then-trim: the new rows overwrite the sheet in place, then only the
 * leftover tail is cleared. A failed write leaves the previous data intact
 * instead of an empty sheet.
 */
export async function syncAllStudents(rows: (string | number)[][]) {
  await sheetsPut(`Sheet1!A1:${LAST_COLUMN}${rows.length + 1}`, [HEADERS, ...rows])
  await sheetsClear(`Sheet1!A${rows.length + 2}:${LAST_COLUMN}`)
}

export async function updateStudentRow(
  studentId: string,
  testStats: {
    totalTests: number; testsPassed: number; avgScore: number
    lastTestTitle: string; lastScore: number; lastPassed: boolean; lastDate: string
  }
) {
  const ids = await sheetsGet(`Sheet1!F:F`)
  const idx = ids.findIndex((r, i) => i > 0 && r[0] === studentId)
  if (idx === -1) return
  const rowNum = idx + 1
  await sheetsPut(`Sheet1!H${rowNum}:${LAST_COLUMN}${rowNum}`, [[
    testStats.totalTests, testStats.testsPassed, testStats.avgScore,
    testStats.lastTestTitle, testStats.lastScore,
    testStats.lastPassed ? 'Passed' : 'Failed', testStats.lastDate,
  ]])
}

