'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle, XCircle, Users, TrendingUp, ClipboardList, Download } from 'lucide-react'

interface Row {
  id: string; studentName: string; class: string; section: string
  testId: string; testTitle: string; subject: string
  score: number; totalMarks: number; percentage: number
  passed: boolean; completedAt: string
}
interface Summary { total: number; passed: number; failed: number; passRate: number; avgScore: number }

function badge(passed: boolean) {
  return passed
    ? <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-forest/10 text-forest"><CheckCircle size={10} /> Pass</span>
    : <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600"><XCircle size={10} /> Fail</span>
}

function fmt(d: string) {
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function EducatorResultsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [scope, setScope] = useState<'ALL' | 'OWN_STUDENTS' | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetch('/api/educator/test-results').then((r) => r.json())
    setRows(data.rows ?? [])
    setSummary(data.summary ?? null)
    setScope(data.scope ?? null)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function exportCSV() {
    const headers = ['Student Name', 'Class', 'Section', 'Test', 'Subject', 'Score', 'Total Marks', 'Percentage', 'Pass/Fail', 'Submitted At']
    const csvRows = rows.map((r) => [
      r.studentName, r.class, r.section, r.testTitle, r.subject,
      r.score, r.totalMarks, `${r.percentage}%`, r.passed ? 'Pass' : 'Fail', fmt(r.completedAt),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const csv = [headers.join(','), ...csvRows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `student-results-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-midnight flex items-center gap-2">
            <ClipboardList size={24} /> Student Results
          </h1>
          <p className="text-sm text-charcoal/50 mt-0.5">
            {scope === 'ALL' ? 'All students, campus-wide' : "Only the students you've added"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-charcoal hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={exportCSV}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-midnight text-white hover:bg-midnight/80 disabled:opacity-40 transition-colors">
            <Download size={14} /> Export CSV ({rows.length})
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Users, label: 'Total Attempts', val: summary.total, color: 'bg-midnight text-white', ic: 'text-gold' },
            { icon: CheckCircle, label: 'Passed', val: summary.passed, color: 'bg-white border border-gray-100', ic: 'text-forest' },
            { icon: TrendingUp, label: 'Pass Rate', val: `${summary.passRate}%`, color: 'bg-forest text-white', ic: 'text-white' },
            { icon: TrendingUp, label: 'Avg Score', val: `${summary.avgScore}%`, color: 'bg-gold text-midnight', ic: 'text-midnight' },
          ].map((k) => (
            <div key={k.label} className={`rounded-2xl p-4 text-center ${k.color}`}>
              <k.icon size={18} className={`${k.ic} mx-auto mb-1`} />
              <div className="text-2xl font-bold">{k.val}</div>
              <div className="text-xs opacity-60">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 text-charcoal/40">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No results yet for your students.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-charcoal/50 font-semibold text-xs">#</th>
                <th className="text-left px-4 py-3 text-charcoal/50 font-semibold text-xs">Student</th>
                <th className="text-left px-4 py-3 text-charcoal/50 font-semibold text-xs">Class</th>
                <th className="text-left px-4 py-3 text-charcoal/50 font-semibold text-xs">Test</th>
                <th className="text-center px-4 py-3 text-charcoal/50 font-semibold text-xs">Score</th>
                <th className="text-center px-4 py-3 text-charcoal/50 font-semibold text-xs">%</th>
                <th className="text-center px-4 py-3 text-charcoal/50 font-semibold text-xs">Result</th>
                <th className="text-left px-4 py-3 text-charcoal/50 font-semibold text-xs">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={`border-b border-gray-50 hover:bg-gray-50/70 ${r.passed ? '' : 'bg-red-50/20'}`}>
                  <td className="px-4 py-3 text-charcoal/30 text-xs">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-midnight">{r.studentName}</td>
                  <td className="px-4 py-3 text-charcoal/70">Class {r.class}{r.section ? ` · ${r.section}` : ''}</td>
                  <td className="px-4 py-3 font-medium text-midnight max-w-40 truncate">{r.testTitle}</td>
                  <td className="px-4 py-3 text-center text-charcoal/70">{r.score}/{r.totalMarks}</td>
                  <td className="px-4 py-3 text-center font-bold text-midnight">{r.percentage}%</td>
                  <td className="px-4 py-3 text-center">{badge(r.passed)}</td>
                  <td className="px-4 py-3 text-xs text-charcoal/50 whitespace-nowrap">{fmt(r.completedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
