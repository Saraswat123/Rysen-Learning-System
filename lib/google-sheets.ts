import { google } from 'googleapis'

const SHEET_ID = process.env.GOOGLE_SHEETS_ID ?? ''

// Column layout (1-indexed)
// A=Branch B=Name C=Class D=Section E=Subject F=Phone G=Status
// H=Total Tests I=Tests Passed J=Avg Score% K=Last Test L=Last Score% M=Last Result N=Last Date
export const HEADERS = [
  'Branch', 'Name', 'Class', 'Section', 'Subject', 'Phone', 'Status',
  'Total Tests', 'Tests Passed', 'Avg Score%', 'Last Test', 'Last Score%', 'Last Result', 'Last Date',
]

function getAuth() {
  const email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
  const key = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!email || !key) return null
  return new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

export function sheetsEnabled() {
  return !!(process.env.GOOGLE_SHEETS_CLIENT_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY && SHEET_ID)
}

async function getSheetsClient() {
  const auth = getAuth()
  if (!auth) throw new Error('Google Sheets credentials not configured')
  return google.sheets({ version: 'v4', auth })
}

export async function readSheet(): Promise<string[][]> {
  const sheets = await getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A1:N5000',
  })
  return (res.data.values as string[][] | null) ?? []
}

export async function ensureHeaders() {
  const sheets = await getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A1:N1',
  })
  const existing = (res.data.values?.[0] ?? []) as string[]
  if (existing.length === 0 || existing[0] !== 'Branch') {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!A1:N1',
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    })
  }
}

export async function syncAllStudents(rows: string[][]) {
  const sheets = await getSheetsClient()
  await ensureHeaders()
  // Clear data rows, preserve header
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A2:N5000',
  })
  if (rows.length === 0) return
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Sheet1!A2:N${rows.length + 1}`,
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  })
}

// Update a single student row identified by Name + Branch match
export async function updateStudentRow(
  branch: string,
  name: string,
  testStats: {
    totalTests: number; testsPassed: number; avgScore: number
    lastTestTitle: string; lastScore: number; lastPassed: boolean; lastDate: string
  }
) {
  const sheets = await getSheetsClient()
  const rows = await readSheet()
  // rows[0] is header, find student row
  const idx = rows.findIndex((r, i) => i > 0 && r[0] === branch && r[1] === name)
  if (idx === -1) return // student not in sheet yet

  const rowNum = idx + 1 // 1-indexed, +1 because idx 0 is row 1 (header)
  const range = `Sheet1!H${rowNum}:N${rowNum}`
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        testStats.totalTests,
        testStats.testsPassed,
        testStats.avgScore,
        testStats.lastTestTitle,
        testStats.lastScore,
        testStats.lastPassed ? 'Passed' : 'Failed',
        testStats.lastDate,
      ]],
    },
  })
}
