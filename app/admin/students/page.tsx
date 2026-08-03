'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Download, Plus, Search, Trash2, UserCheck, UserX, Upload, X,
  CheckCircle, AlertCircle, FileText, ChevronDown, RefreshCw,
  Sheet, Building2, Users
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface Branch { id: string; name: string; location: string }
interface Student {
  id: string; name: string; class: string; section: string
  subject: string; isActive: boolean; createdAt: string
  branch: Branch | null; _count: { attempts: number }
}
interface BranchGroup { branch: Branch | null; students: Student[] }
interface ParsedRow { name: string; class: string; section: string; subject: string; valid: boolean }

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const hasHeader = lines[0]?.toLowerCase().includes('name') || lines[0]?.toLowerCase().includes('class')
  const dataLines = hasHeader ? lines.slice(1) : lines
  return dataLines.map((line) => {
    const cols = line.includes('\t') ? line.split('\t') : line.split(',')
    const [name, cls, section, subject] = cols.map((c) => c.trim().replace(/^"|"$/g, ''))
    return { name: name ?? '', class: cls ?? '', section: section ?? '', subject: subject ?? '', valid: !!(name && cls) }
  })
}

function groupByBranch(students: Student[]): BranchGroup[] {
  const map = new Map<string, BranchGroup>()
  const NO_BRANCH = '__none__'
  for (const s of students) {
    const key = s.branch?.id ?? NO_BRANCH
    if (!map.has(key)) map.set(key, { branch: s.branch, students: [] })
    map.get(key)!.students.push(s)
  }
  // Sort: named branches alphabetically, no-branch last
  return [...map.entries()]
    .sort(([ka], [kb]) => {
      if (ka === NO_BRANCH) return 1
      if (kb === NO_BRANCH) return -1
      return (map.get(ka)!.branch?.name ?? '').localeCompare(map.get(kb)!.branch?.name ?? '')
    })
    .map(([, g]) => g)
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set(['all']))
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', class: '', section: '', subject: '', branchId: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importBranchId, setImportBranchId] = useState('')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ added: number; skipped: number; errors: string[] } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterClass) params.set('class', filterClass)
    const [s, b] = await Promise.all([
      fetch(`/api/students?${params}`).then((r) => r.json()),
      fetch('/api/branches').then((r) => r.json()),
    ])
    setStudents(Array.isArray(s) ? s : [])
    setBranches(Array.isArray(b) ? b : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filterClass]) // eslint-disable-line

  async function addStudent(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch('/api/students', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setShowAdd(false)
    setForm({ name: '', class: '', section: '', subject: '', branchId: '' })
    load()
  }

  async function toggleActive(student: Student) {
    await fetch(`/api/students/${student.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !student.isActive }),
    })
    load()
  }

  async function deleteStudent(id: string) {
    if (!confirm('Delete this student? All test attempts will be lost.')) return
    await fetch(`/api/students/${id}`, { method: 'DELETE' })
    load()
  }

  async function syncToSheet() {
    setSyncing(true); setSyncMsg('')
    const res = await fetch('/api/admin/students/sheet', { method: 'POST' })
    const data = await res.json()
    setSyncing(false)
    if (data.ok) setSyncMsg(`✓ Synced ${data.synced} students to Google Sheet`)
    else setSyncMsg(`✗ ${data.error}`)
  }

  function exportCSV() { window.open('/api/students/export', '_blank') }

  function downloadTemplate() {
    const csv = 'Name,Class,Section,Subject,Phone\nArjun Sharma,10,A,Science,9876543210\nPriya Verma,9,B,Maths,'
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'students-template.csv'; a.click()
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const r = new FileReader(); r.onload = (ev) => { setParsedRows(parseCSV(ev.target?.result as string)); setImportResult(null) }; r.readAsText(file)
  }

  async function runImport() {
    const valid = parsedRows.filter((r) => r.valid); if (!valid.length) return
    setImporting(true)
    const res = await fetch('/api/students/bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: valid, branchId: importBranchId || undefined }),
    })
    const data = await res.json(); setImporting(false); setImportResult(data)
    if (data.added > 0) { load(); setParsedRows([]) }
  }

  function toggleBranch(key: string) {
    setExpandedBranches((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function expandAll() { setExpandedBranches(new Set(groups.map((g) => g.branch?.id ?? '__none__'))) }
  function collapseAll() { setExpandedBranches(new Set()) }

  const filtered = students.filter((s) =>
    (search ? s.name.toLowerCase().includes(search.toLowerCase()) || s.class.includes(search) : true) &&
    (filterClass ? s.class === filterClass : true)
  )
  const groups = groupByBranch(filtered)
  const classes = [...new Set(students.map((s) => s.class))].sort()

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-midnight">Students</h1>
          <p className="text-sm text-charcoal/60 mt-0.5">{students.length} total · {branches.length} campuses</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={syncToSheet} disabled={syncing}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-green-200 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50">
            <Sheet size={13} /> {syncing ? 'Syncing…' : 'Sync to Sheet'}
          </button>
          <Button onClick={exportCSV} size="sm" className="bg-forest text-white flex items-center gap-2">
            <Download size={15} /> Export CSV
          </Button>
          <Button onClick={() => { setShowImport(true); setImportResult(null); setParsedRows([]) }} size="sm"
            className="bg-olive/90 text-white flex items-center gap-2">
            <Upload size={15} /> Bulk Import
          </Button>
          <Button onClick={() => setShowAdd(true)} size="sm" className="flex items-center gap-2">
            <Plus size={15} /> Add Student
          </Button>
        </div>
      </div>

      {syncMsg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${syncMsg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {syncMsg}
          <span className="ml-2 text-xs opacity-60">· Google Sheet auto-updates whenever a student submits a test</span>
        </div>
      )}

      {/* Add Student Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-midnight mb-4">Add Student</h2>
            <form onSubmit={addStudent} className="flex flex-col gap-3">
              <Input label="Full Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Class" placeholder="e.g. 10" value={form.class} onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))} required />
                <Input label="Section" placeholder="e.g. A" value={form.section} onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))} />
              </div>
              <Input label="Subject" placeholder="e.g. Science" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-charcoal">Branch / Campus</label>
                <select value={form.branchId} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-midnight">
                  <option value="">No specific branch</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-3 mt-2">
                <Button type="button" onClick={() => setShowAdd(false)} className="flex-1 bg-gray-100 text-charcoal hover:bg-gray-200">Cancel</Button>
                <Button type="submit" loading={saving} className="flex-1">Add Student</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-auto flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-midnight">Bulk Import Students</h2>
              <button onClick={() => setShowImport(false)} className="text-charcoal/40 hover:text-charcoal"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              <div className="bg-midnight/5 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-midnight/50" />
                  <div>
                    <p className="text-sm font-semibold text-midnight">CSV: Name, Class, Section, Subject, Phone</p>
                    <p className="text-xs text-charcoal/50">Header optional. Section/Subject/Phone can be blank.</p>
                  </div>
                </div>
                <button onClick={downloadTemplate} className="flex items-center gap-1 text-xs font-semibold text-midnight hover:underline whitespace-nowrap">
                  <Download size={13} /> Template
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-charcoal">Assign to Campus</label>
                <select value={importBranchId} onChange={(e) => setImportBranchId(e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight">
                  <option value="">No specific branch</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.location}</option>)}
                </select>
              </div>
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-midnight/30 hover:bg-midnight/5 transition-all">
                <Upload size={28} className="mx-auto mb-2 text-charcoal/30" />
                <p className="text-sm font-semibold text-midnight">Click to upload CSV</p>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
              </div>
              {importResult && (
                <div className={`rounded-xl p-4 flex items-start gap-3 ${importResult.added > 0 ? 'bg-forest/10' : 'bg-amber-50'}`}>
                  {importResult.added > 0 ? <CheckCircle size={18} className="text-forest" /> : <AlertCircle size={18} className="text-amber-600" />}
                  <p className="text-sm font-semibold text-midnight">{importResult.added} added · {importResult.skipped} skipped{importResult.errors.length > 0 ? ` · Failed: ${importResult.errors.join(', ')}` : ''}</p>
                </div>
              )}
              {parsedRows.length > 0 && !importResult && (
                <div>
                  <p className="text-sm font-semibold text-midnight mb-2">{parsedRows.filter(r => r.valid).length} valid · {parsedRows.filter(r => !r.valid).length} invalid</p>
                  <div className="border border-gray-100 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0"><tr>
                        <th className="text-left px-3 py-2 text-charcoal/50">Name</th>
                        <th className="text-left px-3 py-2 text-charcoal/50">Class</th>
                        <th className="text-left px-3 py-2 text-charcoal/50">Section</th>
                        <th className="px-3 py-2" />
                      </tr></thead>
                      <tbody>
                        {parsedRows.map((r, i) => (
                          <tr key={i} className={`border-t border-gray-50 ${r.valid ? '' : 'bg-red-50'}`}>
                            <td className="px-3 py-2 font-medium">{r.name || <span className="text-red-500 italic">missing</span>}</td>
                            <td className="px-3 py-2">{r.class || <span className="text-red-500 italic">missing</span>}</td>
                            <td className="px-3 py-2 text-charcoal/50">{r.section || '—'}</td>
                            <td className="px-3 py-2 text-center">{r.valid ? <CheckCircle size={12} className="text-forest mx-auto" /> : <X size={12} className="text-red-500 mx-auto" />}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <Button onClick={() => setShowImport(false)} className="flex-1 bg-gray-100 text-charcoal hover:bg-gray-200">Close</Button>
              {parsedRows.length > 0 && !importResult && (
                <Button onClick={runImport} loading={importing} disabled={!parsedRows.some(r => r.valid)} className="flex-1">
                  Import {parsedRows.filter(r => r.valid).length} Students
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" />
          <input className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight"
            placeholder="Search by name or class…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight">
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c} value={c}>Class {c}</option>)}
        </select>
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={expandAll} className="text-xs text-charcoal/50 hover:text-midnight px-2 py-1 rounded-lg hover:bg-gray-100">Expand all</button>
          <button onClick={collapseAll} className="text-xs text-charcoal/50 hover:text-midnight px-2 py-1 rounded-lg hover:bg-gray-100">Collapse all</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-charcoal/40 text-sm">No students found.</div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const key = g.branch?.id ?? '__none__'
            const isOpen = expandedBranches.has(key)
            const activeCount = g.students.filter(s => s.isActive).length

            return (
              <div key={key} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Branch header — clickable */}
                <button onClick={() => toggleBranch(key)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-midnight flex items-center justify-center flex-shrink-0">
                      <Building2 size={16} className="text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-midnight">{g.branch?.name ?? 'No Campus Assigned'}</p>
                      {g.branch?.location && <p className="text-xs text-charcoal/40">{g.branch.location}</p>}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-xs bg-midnight/10 text-midnight font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Users size={10} /> {g.students.length}
                      </span>
                      {activeCount < g.students.length && (
                        <span className="text-xs bg-red-50 text-red-500 font-bold px-2 py-0.5 rounded-full">
                          {g.students.length - activeCount} inactive
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-charcoal/30 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Student rows */}
                {isOpen && (
                  <div className="border-t border-gray-50">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50/70">
                          <th className="text-left px-5 py-2.5 text-xs font-bold text-charcoal/40 uppercase tracking-wider">Name</th>
                          <th className="text-left px-5 py-2.5 text-xs font-bold text-charcoal/40 uppercase tracking-wider">Class</th>
                          <th className="text-left px-5 py-2.5 text-xs font-bold text-charcoal/40 uppercase tracking-wider hidden sm:table-cell">Subject</th>

                          <th className="text-left px-5 py-2.5 text-xs font-bold text-charcoal/40 uppercase tracking-wider hidden lg:table-cell">Tests</th>
                          <th className="text-left px-5 py-2.5 text-xs font-bold text-charcoal/40 uppercase tracking-wider">Status</th>
                          <th className="px-5 py-2.5" />
                        </tr>
                      </thead>
                      <tbody>
                        {g.students.map((s) => (
                          <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                            <td className="px-5 py-3 font-medium text-midnight">{s.name}</td>
                            <td className="px-5 py-3 text-charcoal/70">{s.class}{s.section ? ` · ${s.section}` : ''}</td>
                            <td className="px-5 py-3 text-charcoal/50 hidden sm:table-cell">{s.subject || '—'}</td>

                            <td className="px-5 py-3 text-charcoal/50 hidden lg:table-cell">{s._count.attempts}</td>
                            <td className="px-5 py-3">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.isActive ? 'bg-forest/10 text-forest' : 'bg-red-50 text-red-600'}`}>
                                {s.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => toggleActive(s)} title={s.isActive ? 'Deactivate' : 'Activate'}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 text-charcoal/40 hover:text-charcoal transition-colors">
                                  {s.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                                </button>
                                <button onClick={() => deleteStudent(s.id)} title="Delete"
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-charcoal/40 hover:text-red-600 transition-colors">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Sheet info banner */}
      <div className="mt-6 bg-green-50 border border-green-100 rounded-2xl p-4 flex items-start gap-3">
        <Sheet size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-green-800">Google Sheet live sync</p>
          <p className="text-xs text-green-700/70 mt-0.5">
            Sheet columns: Branch · Name · Class · Section · Subject · Phone · Status · Total Tests · Tests Passed · Avg Score% · Last Test · Last Score% · Last Result · Last Date.
            Test results auto-write to sheet every time a student submits. Use "Sync to Sheet" to push current roster.
          </p>
          <p className="text-xs text-green-700/50 mt-1">Requires GOOGLE_SHEETS_CLIENT_EMAIL · GOOGLE_SHEETS_PRIVATE_KEY · GOOGLE_SHEETS_ID in Vercel env vars.</p>
        </div>
      </div>
    </div>
  )
}
