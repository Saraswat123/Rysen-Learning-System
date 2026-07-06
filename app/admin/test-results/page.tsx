'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, Filter, RefreshCw, CheckCircle, XCircle, MapPin, Users, TrendingUp, ClipboardList } from 'lucide-react'

interface Branch { id: string; name: string; location: string }
interface Test { id: string; title: string; subject: string }
interface Row {
  id: string; studentName: string; class: string; section: string
  branchName: string; location: string; branchId: string
  testId: string; testTitle: string; subject: string
  score: number; totalMarks: number; percentage: number
  passed: boolean; completedAt: string
}
interface LocationSummary { location: string; total: number; passed: number }
interface Summary { total: number; passed: number; failed: number; passRate: number; byLocation: LocationSummary[] }

function badge(passed: boolean) {
  return passed
    ? <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-forest/10 text-forest"><CheckCircle size={10} /> Pass</span>
    : <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600"><XCircle size={10} /> Fail</span>
}

function fmt(d: string) {
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function TestResultsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [tests, setTests] = useState<Test[]>([])
  const [loading, setLoading] = useState(false)

  const [filters, setFilters] = useState({ branchId: '', testId: '', class: '', from: '', to: '' })
  const [groupByLocation, setGroupByLocation] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const q = new URLSearchParams()
    if (filters.branchId) q.set('branchId', filters.branchId)
    if (filters.testId) q.set('testId', filters.testId)
    if (filters.class) q.set('class', filters.class)
    if (filters.from) q.set('from', filters.from)
    if (filters.to) q.set('to', filters.to)
    const data = await fetch(`/api/admin/test-results?${q}`).then((r) => r.json())
    setRows(data.rows ?? [])
    setSummary(data.summary ?? null)
    setBranches(data.branches ?? [])
    setTests(data.tests ?? [])
    setLoading(false)
  }, [filters])

  useEffect(() => { load() }, [load])

  function exportCSV(subset?: Row[]) {
    const data = subset ?? rows
    const headers = ['Student Name', 'Class', 'Section', 'Branch', 'Location', 'Test', 'Subject', 'Score', 'Total Marks', 'Percentage', 'Pass/Fail', 'Submitted At']
    const csvRows = data.map((r) => [
      r.studentName, r.class, r.section, r.branchName, r.location,
      r.testTitle, r.subject, r.score, r.totalMarks, `${r.percentage}%`,
      r.passed ? 'Pass' : 'Fail',
      fmt(r.completedAt),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const csv = [headers.join(','), ...csvRows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rysen-test-results-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Group rows by location for grouped view
  const locationGroups = groupByLocation
    ? Array.from(new Set(rows.map((r) => r.location))).sort().map((loc) => ({
        location: loc,
        rows: rows.filter((r) => r.location === loc),
      }))
    : null

  const uniqueClasses = Array.from(new Set(rows.map((r) => r.class))).sort()

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-midnight flex items-center gap-2">
            <ClipboardList size={24} /> Test Results Sheet
          </h1>
          <p className="text-sm text-charcoal/50 mt-0.5">All locations · live data</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-charcoal hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => exportCSV()}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-midnight text-white hover:bg-midnight/80 disabled:opacity-40 transition-colors">
            <Download size={14} /> Export CSV ({rows.length})
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Users, label: 'Total Attempts', val: summary.total, color: 'bg-midnight text-white', ic: 'text-gold' },
            { icon: CheckCircle, label: 'Passed', val: summary.passed, color: 'bg-white border border-gray-100', ic: 'text-forest' },
            { icon: XCircle, label: 'Failed', val: summary.failed, color: 'bg-white border border-gray-100', ic: 'text-red-500' },
            { icon: TrendingUp, label: 'Pass Rate', val: `${summary.passRate}%`, color: 'bg-forest text-white', ic: 'text-white' },
          ].map((k) => (
            <div key={k.label} className={`rounded-2xl p-4 text-center ${k.color}`}>
              <k.icon size={18} className={`${k.ic} mx-auto mb-1`} />
              <div className="text-2xl font-bold">{k.val}</div>
              <div className="text-xs opacity-60">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Location summary strip */}
      {summary && summary.byLocation.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <p className="text-xs font-semibold text-charcoal/50 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <MapPin size={12} /> Location Summary
          </p>
          <div className="flex flex-wrap gap-3">
            {summary.byLocation.map((l) => {
              const rate = l.total > 0 ? Math.round((l.passed / l.total) * 100) : 0
              return (
                <div key={l.location} className="flex items-center gap-2 bg-midnight/5 px-3 py-2 rounded-xl">
                  <MapPin size={13} className="text-midnight/40" />
                  <span className="text-sm font-semibold text-midnight">{l.location}</span>
                  <span className="text-xs text-charcoal/50">{l.total} attempts</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${rate >= 70 ? 'bg-forest/10 text-forest' : rate >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                    {rate}% pass
                  </span>
                  <button
                    onClick={() => exportCSV(rows.filter((r) => r.location === l.location))}
                    className="text-midnight/30 hover:text-midnight transition-colors ml-1" title={`Export ${l.location}`}>
                    <Download size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-charcoal/50" />
          <span className="text-sm font-semibold text-charcoal/60">Filters</span>
          {Object.values(filters).some(Boolean) && (
            <button onClick={() => setFilters({ branchId: '', testId: '', class: '', from: '', to: '' })}
              className="ml-auto text-xs text-red-500 font-semibold hover:text-red-700">Clear All</button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <select value={filters.branchId} onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight bg-white">
            <option value="">All Branches</option>
            {Array.from(new Map(branches.map((b) => [b.location, b])).values()).map((b) => (
              <optgroup key={b.location} label={b.location}>
                {branches.filter((br) => br.location === b.location).map((br) => (
                  <option key={br.id} value={br.id}>{br.name}</option>
                ))}
              </optgroup>
            ))}
          </select>

          <select value={filters.testId} onChange={(e) => setFilters((f) => ({ ...f, testId: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight bg-white">
            <option value="">All Tests</option>
            {tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>

          <select value={filters.class} onChange={(e) => setFilters((f) => ({ ...f, class: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight bg-white">
            <option value="">All Classes</option>
            {uniqueClasses.map((c) => <option key={c} value={c}>Class {c}</option>)}
          </select>

          <input type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight"
            placeholder="From date" />
          <input type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight"
            placeholder="To date" />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setGroupByLocation((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${groupByLocation ? 'bg-midnight text-white border-midnight' : 'border-gray-200 text-charcoal/60 hover:border-midnight/30'}`}>
            <MapPin size={12} /> Group by Location
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 text-charcoal/40">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No results found. Adjust filters or wait for students to submit tests.</p>
        </div>
      ) : groupByLocation && locationGroups ? (
        <div className="flex flex-col gap-6">
          {locationGroups.map(({ location, rows: locRows }) => {
            const passed = locRows.filter((r) => r.passed).length
            return (
              <div key={location} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 bg-midnight/5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin size={15} className="text-midnight/50" />
                    <span className="font-bold text-midnight">{location}</span>
                    <span className="text-xs text-charcoal/50">{locRows.length} attempts · {Math.round((passed / locRows.length) * 100)}% pass</span>
                  </div>
                  <button onClick={() => exportCSV(locRows)}
                    className="flex items-center gap-1 text-xs font-semibold text-midnight/60 hover:text-midnight transition-colors">
                    <Download size={12} /> Export
                  </button>
                </div>
                <ResultsTable rows={locRows} />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <ResultsTable rows={rows} />
        </div>
      )}
    </div>
  )
}

function ResultsTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[900px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-4 py-3 text-charcoal/50 font-semibold text-xs">#</th>
            <th className="text-left px-4 py-3 text-charcoal/50 font-semibold text-xs">Student</th>
            <th className="text-left px-4 py-3 text-charcoal/50 font-semibold text-xs">Class</th>
            <th className="text-left px-4 py-3 text-charcoal/50 font-semibold text-xs">Section</th>
            <th className="text-left px-4 py-3 text-charcoal/50 font-semibold text-xs">Branch</th>
            <th className="text-left px-4 py-3 text-charcoal/50 font-semibold text-xs">Location</th>
            <th className="text-left px-4 py-3 text-charcoal/50 font-semibold text-xs">Test</th>
            <th className="text-left px-4 py-3 text-charcoal/50 font-semibold text-xs">Subject</th>
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
              <td className="px-4 py-3 text-charcoal/70">Class {r.class}</td>
              <td className="px-4 py-3 text-charcoal/70">{r.section || '—'}</td>
              <td className="px-4 py-3 text-charcoal/70">{r.branchName}</td>
              <td className="px-4 py-3 text-charcoal/50 text-xs">{r.location}</td>
              <td className="px-4 py-3 font-medium text-midnight max-w-36 truncate">{r.testTitle}</td>
              <td className="px-4 py-3 text-charcoal/50 text-xs">{r.subject || '—'}</td>
              <td className="px-4 py-3 text-center text-charcoal/70">{r.score}/{r.totalMarks}</td>
              <td className="px-4 py-3 text-center font-bold text-midnight">{r.percentage}%</td>
              <td className="px-4 py-3 text-center">{badge(r.passed)}</td>
              <td className="px-4 py-3 text-xs text-charcoal/50 whitespace-nowrap">{fmt(r.completedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
