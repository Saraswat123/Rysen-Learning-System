// Google Sheets via OAuth2 refresh token (client_secret JSON + one-time auth flow)
// Required env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_SHEETS_ID

export const HEADERS = [
  'Branch', 'Name', 'Class', 'Section', 'Subject', 'Status',
  'Total Tests', 'Tests Passed', 'Avg Score%', 'Last Test', 'Last Score%', 'Last Result', 'Last Date',
]

const SHEET_ID = process.env.GOOGLE_SHEETS_ID ?? ''

export function sheetsEnabled() {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN &&
    SHEET_ID
  )
}

async function getAccessToken(): Promise<string> {
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
  const data = await res.json() as { access_token?: string; error?: string }
  if (!data.access_token) throw new Error(`Token error: ${data.error}`)
  return data.access_token
}

async function sheetsGet(range: string): Promise<string[][]> {
  const token = await getAccessToken()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  const data = await res.json() as { values?: string[][] }
  return data.values ?? []
}

async function sheetsPut(range: string, values: (string | number)[][]) {
  const token = await getAccessToken()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=RAW`
  await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  })
}

async function sheetsClear(range: string) {
  const token = await getAccessToken()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}:clear`
  await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
}

export async function readSheet(): Promise<string[][]> {
  const rows = await sheetsGet('Sheet1!A1:N5000')
  return rows.slice(1) // skip header
}

export async function ensureHeaders() {
  const row = await sheetsGet('Sheet1!A1:N1')
  if (!row[0] || row[0][0] !== 'Branch') {
    await sheetsPut('Sheet1!A1:N1', [HEADERS])
  }
}

export async function syncAllStudents(rows: (string | number)[][]) {
  await ensureHeaders()
  await sheetsClear('Sheet1!A2:N5000')
  if (rows.length > 0) {
    await sheetsPut(`Sheet1!A2:N${rows.length + 1}`, rows)
  }
}

export async function updateStudentRow(
  branch: string,
  name: string,
  testStats: {
    totalTests: number; testsPassed: number; avgScore: number
    lastTestTitle: string; lastScore: number; lastPassed: boolean; lastDate: string
  }
) {
  const rows = await sheetsGet('Sheet1!A1:N5000')
  const idx = rows.findIndex((r, i) => i > 0 && r[0] === branch && r[1] === name)
  if (idx === -1) return
  const rowNum = idx + 1
  await sheetsPut(`Sheet1!H${rowNum}:N${rowNum}`, [[
    testStats.totalTests, testStats.testsPassed, testStats.avgScore,
    testStats.lastTestTitle, testStats.lastScore,
    testStats.lastPassed ? 'Passed' : 'Failed', testStats.lastDate,
  ]])
}
