// Google Sheets integration via Apps Script Web App (no service account required)
// Setup: Extensions → Apps Script in the sheet → deploy as Web App (Execute as: Me, Anyone can access)

export const HEADERS = [
  'Branch', 'Name', 'Class', 'Section', 'Subject', 'Phone', 'Status',
  'Total Tests', 'Tests Passed', 'Avg Score%', 'Last Test', 'Last Score%', 'Last Result', 'Last Date',
]

export function sheetsEnabled() {
  return !!(process.env.GOOGLE_SHEETS_SCRIPT_URL && process.env.GOOGLE_SHEETS_SCRIPT_SECRET)
}

function scriptUrl() { return process.env.GOOGLE_SHEETS_SCRIPT_URL! }
function secret() { return process.env.GOOGLE_SHEETS_SCRIPT_SECRET! }

async function callScript(body: object): Promise<{ ok?: boolean; error?: string; rows?: string[][] }> {
  const res = await fetch(scriptUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: secret(), ...body }),
    // Apps Script follows redirects automatically but fetch may need this
    redirect: 'follow',
  })
  return res.json()
}

export async function readSheet(): Promise<string[][]> {
  const url = `${scriptUrl()}?secret=${encodeURIComponent(secret())}`
  const res = await fetch(url, { redirect: 'follow' })
  const data: { rows?: string[][] } = await res.json()
  return data.rows ?? []
}

export async function ensureHeaders() {
  await callScript({ action: 'ensureHeaders' })
}

export async function syncAllStudents(rows: string[][]) {
  await callScript({ action: 'ensureHeaders' })
  await callScript({ action: 'sync', rows })
}

export async function updateStudentRow(
  branch: string,
  name: string,
  testStats: {
    totalTests: number; testsPassed: number; avgScore: number
    lastTestTitle: string; lastScore: number; lastPassed: boolean; lastDate: string
  }
) {
  await callScript({
    action: 'updateRow',
    branch,
    name,
    stats: [
      testStats.totalTests,
      testStats.testsPassed,
      testStats.avgScore,
      testStats.lastTestTitle,
      testStats.lastScore,
      testStats.lastPassed ? 'Passed' : 'Failed',
      testStats.lastDate,
    ],
  })
}
