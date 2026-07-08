'use client'
import { useState, useEffect } from 'react'
import { Download, RefreshCw, GraduationCap, School, MapPin, TrendingUp, Users, Award, CheckCircle } from 'lucide-react'
import Button from '@/components/ui/Button'

interface EduRow {
  branch: string; location: string; totalEducators: number; programsEnrolled: number; totalPrograms: number
  stageAttempts: number; stagesPassed: number; passPercent: number; avgScore: number; fullyCertified: number
}
interface StuRow {
  branch: string; location: string; totalStudents: number; totalAttempts: number
  passed: number; failed: number; passPercent: number; avgScore: number
}
interface ReportData { educatorReport: EduRow[]; studentReport: StuRow[]; totalStages: number; totalPrograms: number }

function PassBadge({ pct }: { pct: number }) {
  const color = pct >= 75 ? 'bg-forest/10 text-forest' : pct >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${color}`}>{pct}%</span>
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [tab, setTab] = useState<'educator' | 'student'>('educator')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/reports')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function exportExcel() {
    if (!data) return
    setExporting(true)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()

      // Educator sheet
      const eduHeaders = ['Branch', 'Location', 'Total Educators', 'Programs Enrolled', 'Stage Attempts', 'Stages Passed', 'Pass %', 'Avg Score (%)', 'Fully Certified']
      const eduRows = data.educatorReport.map((r) => [
        r.branch, r.location, r.totalEducators, r.programsEnrolled,
        r.stageAttempts, r.stagesPassed, r.passPercent, r.avgScore, r.fullyCertified,
      ])
      const ws1 = XLSX.utils.aoa_to_sheet([eduHeaders, ...eduRows])
      ws1['!cols'] = [20, 18, 14, 16, 14, 14, 10, 14, 14].map((w) => ({ wch: w }))
      XLSX.utils.book_append_sheet(wb, ws1, 'Educator Report')

      // Student sheet
      const stuHeaders = ['Branch', 'Location', 'Total Students', 'Total Attempts', 'Passed', 'Failed', 'Pass %', 'Avg Score (%)']
      const stuRows = data.studentReport.map((r) => [
        r.branch, r.location, r.totalStudents, r.totalAttempts, r.passed, r.failed, r.passPercent, r.avgScore,
      ])
      const ws2 = XLSX.utils.aoa_to_sheet([stuHeaders, ...stuRows])
      ws2['!cols'] = [20, 18, 14, 14, 10, 10, 10, 14].map((w) => ({ wch: w }))
      XLSX.utils.book_append_sheet(wb, ws2, 'Student Report')

      XLSX.writeFile(wb, `rysen-branch-report-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (e) { console.error(e) }
    finally { setExporting(false) }
  }

  const eduTotals = data?.educatorReport.reduce(
    (acc, r) => ({
      educators: acc.educators + r.totalEducators,
      attempts: acc.attempts + r.stageAttempts,
      passed: acc.passed + r.stagesPassed,
      certified: acc.certified + r.fullyCertified,
    }),
    { educators: 0, attempts: 0, passed: 0, certified: 0 }
  )

  const stuTotals = data?.studentReport.reduce(
    (acc, r) => ({
      students: acc.students + r.totalStudents,
      attempts: acc.attempts + r.totalAttempts,
      passed: acc.passed + r.passed,
    }),
    { students: 0, attempts: 0, passed: 0 }
  )

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-midnight">Branch Reports</h1>
          <p className="text-sm text-charcoal/50">Branch-wise performance summary — Educators &amp; Students</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportExcel} loading={exporting} variant="ghost" size="sm" className="border border-forest/30 text-forest hover:bg-forest/5">
            <Download size={14} /> Export Excel
          </Button>
          <Button onClick={load} loading={loading} variant="ghost" size="sm">
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-6 w-fit">
        <button
          onClick={() => setTab('educator')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'educator' ? 'bg-midnight text-white shadow-sm' : 'text-charcoal/60 hover:text-midnight'}`}>
          <GraduationCap size={16} /> Educator Training
        </button>
        <button
          onClick={() => setTab('student')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'student' ? 'bg-midnight text-white shadow-sm' : 'text-charcoal/60 hover:text-midnight'}`}>
          <School size={16} /> Student Tests
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" /></div>
      ) : !data ? (
        <div className="text-center py-16 text-charcoal/40">Failed to load report data.</div>
      ) : tab === 'educator' ? (
        <div className="flex flex-col gap-6">
          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Users, val: eduTotals?.educators ?? 0, label: 'Total Educators', bg: 'bg-midnight text-white', ic: 'text-gold' },
              { icon: TrendingUp, val: `${eduTotals?.attempts ? Math.round((eduTotals.passed / eduTotals.attempts) * 100) : 0}%`, label: 'Overall Pass Rate', bg: 'bg-white border border-gray-100', ic: 'text-forest' },
              { icon: Award, val: eduTotals?.certified ?? 0, label: 'Fully Certified', bg: 'bg-forest text-white', ic: 'text-white' },
              { icon: CheckCircle, val: data.totalStages, label: 'Total Stages', bg: 'bg-white border border-gray-100', ic: 'text-midnight' },
            ].map((k) => (
              <div key={k.label} className={`rounded-2xl p-5 text-center ${k.bg}`}>
                <k.icon size={22} className={`${k.ic} mx-auto mb-2`} />
                <div className="text-3xl font-bold">{k.val}</div>
                <div className="text-xs opacity-60 mt-1">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
              <GraduationCap size={18} className="text-midnight" />
              <h2 className="font-bold text-midnight">Educator Training — Branch Summary</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-midnight/5 text-left">
                    <th className="px-5 py-3 font-semibold text-midnight">Branch</th>
                    <th className="px-4 py-3 font-semibold text-midnight">Location</th>
                    <th className="px-4 py-3 font-semibold text-midnight text-center">Educators</th>
                    <th className="px-4 py-3 font-semibold text-midnight text-center">Programs Enrolled</th>
                    <th className="px-4 py-3 font-semibold text-midnight text-center">Stage Attempts</th>
                    <th className="px-4 py-3 font-semibold text-midnight text-center">Stages Passed</th>
                    <th className="px-4 py-3 font-semibold text-midnight text-center">Pass %</th>
                    <th className="px-4 py-3 font-semibold text-midnight text-center">Avg Score</th>
                    <th className="px-4 py-3 font-semibold text-midnight text-center">Fully Certified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.educatorReport.map((r) => (
                    <tr key={r.branch} className="hover:bg-midnight/[0.02] transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-midnight flex items-center gap-1.5">
                        <MapPin size={13} className="text-charcoal/40 flex-shrink-0" /> {r.branch}
                      </td>
                      <td className="px-4 py-3.5 text-charcoal/60">{r.location}</td>
                      <td className="px-4 py-3.5 text-center font-medium text-midnight">{r.totalEducators}</td>
                      <td className="px-4 py-3.5 text-center text-charcoal/70">{r.programsEnrolled}/{r.totalPrograms}</td>
                      <td className="px-4 py-3.5 text-center text-charcoal/60">{r.stageAttempts}</td>
                      <td className="px-4 py-3.5 text-center text-charcoal/60">{r.stagesPassed}</td>
                      <td className="px-4 py-3.5 text-center"><PassBadge pct={r.passPercent} /></td>
                      <td className="px-4 py-3.5 text-center font-medium text-midnight">{r.avgScore > 0 ? `${r.avgScore}%` : '—'}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${r.fullyCertified > 0 ? 'bg-forest/10 text-forest' : 'bg-gray-100 text-charcoal/40'}`}>
                          <Award size={11} /> {r.fullyCertified}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data.educatorReport.length === 0 && (
                    <tr><td colSpan={9} className="px-5 py-12 text-center text-charcoal/40">No branch data found.</td></tr>
                  )}
                </tbody>
                {data.educatorReport.length > 1 && (
                  <tfoot>
                    <tr className="bg-midnight/5 font-bold border-t border-gray-200">
                      <td className="px-5 py-3 text-midnight" colSpan={2}>Total</td>
                      <td className="px-4 py-3 text-center text-midnight">{eduTotals?.educators}</td>
                      <td className="px-4 py-3 text-center text-charcoal/60">—</td>
                      <td className="px-4 py-3 text-center text-charcoal/60">{eduTotals?.attempts}</td>
                      <td className="px-4 py-3 text-center text-charcoal/60">{eduTotals?.passed}</td>
                      <td className="px-4 py-3 text-center">
                        <PassBadge pct={eduTotals?.attempts ? Math.round(((eduTotals?.passed ?? 0) / eduTotals.attempts) * 100) : 0} />
                      </td>
                      <td className="px-4 py-3 text-center text-charcoal/60">—</td>
                      <td className="px-4 py-3 text-center text-midnight">{eduTotals?.certified}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: School, val: stuTotals?.students ?? 0, label: 'Total Students', bg: 'bg-midnight text-white', ic: 'text-gold' },
              { icon: TrendingUp, val: stuTotals?.attempts ?? 0, label: 'Total Attempts', bg: 'bg-white border border-gray-100', ic: 'text-midnight' },
              { icon: CheckCircle, val: stuTotals?.passed ?? 0, label: 'Total Passed', bg: 'bg-forest text-white', ic: 'text-white' },
              { icon: Award, val: `${stuTotals?.attempts ? Math.round(((stuTotals?.passed ?? 0) / stuTotals.attempts) * 100) : 0}%`, label: 'Overall Pass Rate', bg: 'bg-white border border-gray-100', ic: 'text-forest' },
            ].map((k) => (
              <div key={k.label} className={`rounded-2xl p-5 text-center ${k.bg}`}>
                <k.icon size={22} className={`${k.ic} mx-auto mb-2`} />
                <div className="text-3xl font-bold">{k.val}</div>
                <div className="text-xs opacity-60 mt-1">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
              <School size={18} className="text-midnight" />
              <h2 className="font-bold text-midnight">Student Tests — Branch Summary</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-midnight/5 text-left">
                    <th className="px-5 py-3 font-semibold text-midnight">Branch</th>
                    <th className="px-4 py-3 font-semibold text-midnight">Location</th>
                    <th className="px-4 py-3 font-semibold text-midnight text-center">Students</th>
                    <th className="px-4 py-3 font-semibold text-midnight text-center">Attempts</th>
                    <th className="px-4 py-3 font-semibold text-midnight text-center">Passed</th>
                    <th className="px-4 py-3 font-semibold text-midnight text-center">Failed</th>
                    <th className="px-4 py-3 font-semibold text-midnight text-center">Pass %</th>
                    <th className="px-4 py-3 font-semibold text-midnight text-center">Avg Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.studentReport.map((r) => (
                    <tr key={r.branch} className="hover:bg-midnight/[0.02] transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-midnight flex items-center gap-1.5">
                        <MapPin size={13} className="text-charcoal/40 flex-shrink-0" /> {r.branch}
                      </td>
                      <td className="px-4 py-3.5 text-charcoal/60">{r.location}</td>
                      <td className="px-4 py-3.5 text-center font-medium text-midnight">{r.totalStudents}</td>
                      <td className="px-4 py-3.5 text-center text-charcoal/60">{r.totalAttempts}</td>
                      <td className="px-4 py-3.5 text-center text-forest font-semibold">{r.passed}</td>
                      <td className="px-4 py-3.5 text-center text-red-500 font-semibold">{r.failed}</td>
                      <td className="px-4 py-3.5 text-center"><PassBadge pct={r.passPercent} /></td>
                      <td className="px-4 py-3.5 text-center font-medium text-midnight">{r.avgScore > 0 ? `${r.avgScore}%` : '—'}</td>
                    </tr>
                  ))}
                  {data.studentReport.length === 0 && (
                    <tr><td colSpan={8} className="px-5 py-12 text-center text-charcoal/40">No branch data found.</td></tr>
                  )}
                </tbody>
                {data.studentReport.length > 1 && (
                  <tfoot>
                    <tr className="bg-midnight/5 font-bold border-t border-gray-200">
                      <td className="px-5 py-3 text-midnight" colSpan={2}>Total</td>
                      <td className="px-4 py-3 text-center text-midnight">{stuTotals?.students}</td>
                      <td className="px-4 py-3 text-center text-charcoal/60">{stuTotals?.attempts}</td>
                      <td className="px-4 py-3 text-center text-forest">{stuTotals?.passed}</td>
                      <td className="px-4 py-3 text-center text-red-500">{(stuTotals?.attempts ?? 0) - (stuTotals?.passed ?? 0)}</td>
                      <td className="px-4 py-3 text-center">
                        <PassBadge pct={stuTotals?.attempts ? Math.round(((stuTotals?.passed ?? 0) / stuTotals.attempts) * 100) : 0} />
                      </td>
                      <td className="px-4 py-3 text-center text-charcoal/60">—</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
