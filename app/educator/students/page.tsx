'use client'

import { useState, useEffect, useRef } from 'react'
import { Download, Plus, Search, Trash2, UserCheck, UserX, School, Upload, X, CheckCircle, AlertCircle, FileText, Square, SquareCheck } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface Branch { id: string; name: string }
interface Student {
  id: string; name: string; class: string; section: string
  subject: string; isActive: boolean; createdAt: string
  branch: Branch | null; _count: { attempts: number }
}

interface ParsedRow { name: string; class: string; section: string; subject: string; valid: boolean; error?: string }

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return []
  // Detect header row
  const first = lines[0].toLowerCase()
  const hasHeader = first.includes('name') || first.includes('class') || first.includes('student')
  const dataLines = hasHeader ? lines.slice(1) : lines
  return dataLines.map((line) => {
    // Support comma or tab separated
    const cols = line.includes('\t') ? line.split('\t') : line.split(',')
    const [name, cls, section, subject] = cols.map((c) => c.trim().replace(/^"|"$/g, ''))
    const valid = !!(name && cls)
    return { name: name ?? '', class: cls ?? '', section: section ?? '', subject: subject ?? '', valid, error: valid ? undefined : 'Name and Class required' }
  })
}

export default function EducatorStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', class: '', section: '', subject: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Bulk select state
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Bulk import state
  const [showImport, setShowImport] = useState(false)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ added: number; skipped: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterClass) params.set('class', filterClass)
    const s = await fetch(`/api/students?${params}`).then((r) => r.json())
    setStudents(Array.isArray(s) ? s : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filterClass]) // eslint-disable-line

  async function addStudent(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setShowAdd(false)
    setForm({ name: '', class: '', section: '', subject: '' })
    load()
  }

  async function toggleActive(student: Student) {
    await fetch(`/api/students/${student.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !student.isActive }),
    })
    load()
  }

  async function deleteStudent(id: string) {
    if (!confirm('Delete student? All test attempts will be lost.')) return
    await fetch(`/api/students/${id}`, { method: 'DELETE' })
    load()
  }

  async function bulkDelete() {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} selected student${selected.size > 1 ? 's' : ''}? All their test attempts will be lost. This cannot be undone.`)) return
    setBulkDeleting(true)
    await fetch('/api/students/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selected] }),
    })
    setBulkDeleting(false)
    setSelected(new Set())
    load()
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((s) => s.id)))
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setParsedRows(parseCSV(text))
      setImportResult(null)
    }
    reader.readAsText(file)
  }

  async function runImport() {
    const valid = parsedRows.filter((r) => r.valid)
    if (valid.length === 0) return
    setImporting(true)
    const res = await fetch('/api/students/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: valid }),
    })
    const data = await res.json()
    setImporting(false)
    setImportResult(data)
    if (data.added > 0) { load(); setParsedRows([]) }
  }

  function downloadTemplate() {
    const csv = 'Name,Class,Section,Subject\nArjun Sharma,10,A,Science\nPriya Verma,9,B,Maths'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'students-template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = students.filter((s) =>
    search ? s.name.toLowerCase().includes(search.toLowerCase()) || s.class.includes(search) : true
  )
  const classes = [...new Set(students.map((s) => s.class))].sort()
  const validCount = parsedRows.filter((r) => r.valid).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-midnight flex items-center gap-2">
            <School size={24} /> My Students
          </h1>
          <p className="text-sm text-charcoal/60 mt-0.5">{students.length} students in your branch</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => window.open('/api/students/export', '_blank')} size="sm"
            className="bg-forest text-white flex items-center gap-2">
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

      {/* Single Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-midnight mb-4">Add Student to Your Branch</h2>
            <form onSubmit={addStudent} className="flex flex-col gap-3">
              <Input label="Full Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Class" placeholder="e.g. 10" value={form.class} onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))} required />
                <Input label="Section" placeholder="e.g. A" value={form.section} onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))} />
              </div>
              <Input label="Subject" placeholder="e.g. Science" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
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
              <button onClick={() => setShowImport(false)} className="text-charcoal/40 hover:text-charcoal transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {/* Template download */}
              <div className="bg-midnight/5 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-midnight/50" />
                  <div>
                    <p className="text-sm font-semibold text-midnight">CSV Format</p>
                    <p className="text-xs text-charcoal/50">Columns: Name, Class, Section, Subject. First row can be header.</p>
                  </div>
                </div>
                <button onClick={downloadTemplate}
                  className="flex items-center gap-1.5 text-xs font-semibold text-midnight hover:underline underline-offset-2 whitespace-nowrap">
                  <Download size={13} /> Download Template
                </button>
              </div>

              {/* File upload */}
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-midnight/30 hover:bg-midnight/5 transition-all">
                <Upload size={28} className="mx-auto mb-2 text-charcoal/30" />
                <p className="text-sm font-semibold text-midnight">Click to upload CSV file</p>
                <p className="text-xs text-charcoal/40 mt-0.5">.csv files only</p>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
              </div>

              {/* Import result */}
              {importResult && (
                <div className={`rounded-xl p-4 flex items-start gap-3 ${importResult.added > 0 ? 'bg-forest/10' : 'bg-amber-50'}`}>
                  {importResult.added > 0
                    ? <CheckCircle size={18} className="text-forest flex-shrink-0 mt-0.5" />
                    : <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />}
                  <div>
                    <p className="text-sm font-semibold text-midnight">
                      {importResult.added} added · {importResult.skipped} skipped
                    </p>
                    {importResult.errors.length > 0 && (
                      <p className="text-xs text-red-600 mt-0.5">Failed: {importResult.errors.join(', ')}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Preview table */}
              {parsedRows.length > 0 && !importResult && (
                <div>
                  <p className="text-sm font-semibold text-midnight mb-2">
                    Preview — {validCount} valid · {parsedRows.length - validCount} invalid
                  </p>
                  <div className="border border-gray-100 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 text-charcoal/50 font-semibold">Name</th>
                          <th className="text-left px-3 py-2 text-charcoal/50 font-semibold">Class</th>
                          <th className="text-left px-3 py-2 text-charcoal/50 font-semibold">Section</th>
                          <th className="text-left px-3 py-2 text-charcoal/50 font-semibold">Subject</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.map((r, i) => (
                          <tr key={i} className={`border-t border-gray-50 ${r.valid ? '' : 'bg-red-50'}`}>
                            <td className="px-3 py-2 font-medium text-midnight">{r.name || <span className="text-red-500 italic">missing</span>}</td>
                            <td className="px-3 py-2 text-charcoal/70">{r.class || <span className="text-red-500 italic">missing</span>}</td>
                            <td className="px-3 py-2 text-charcoal/50">{r.section || '—'}</td>
                            <td className="px-3 py-2 text-charcoal/50">{r.subject || '—'}</td>
                            <td className="px-3 py-2 text-center">
                              {r.valid
                                ? <CheckCircle size={13} className="text-forest mx-auto" />
                                : <X size={13} className="text-red-500 mx-auto" />}
                            </td>
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
                <Button onClick={runImport} loading={importing} disabled={validCount === 0} className="flex-1">
                  Import {validCount} Students
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete action bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex items-center justify-between gap-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-3">
          <div className="flex items-center gap-2">
            <SquareCheck size={16} className="text-red-500" />
            <span className="text-sm font-semibold text-red-700">{selected.size} student{selected.size > 1 ? 's' : ''} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelected(new Set())}
              className="text-xs text-charcoal/50 hover:text-midnight px-3 py-1.5 rounded-lg hover:bg-white transition-colors">
              Clear selection
            </button>
            <button onClick={bulkDelete} disabled={bulkDeleting}
              className="flex items-center gap-1.5 text-xs font-bold bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-xl transition-colors disabled:opacity-50">
              <Trash2 size={13} /> {bulkDeleting ? 'Deleting…' : `Delete ${selected.size}`}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight"
            placeholder="Search by name or class…"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight">
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c} value={c}>Class {c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3 w-10">
                  <button onClick={toggleSelectAll} className="text-charcoal/30 hover:text-midnight transition-colors">
                    {selected.size > 0 && selected.size === filtered.length
                      ? <SquareCheck size={16} className="text-midnight" />
                      : <Square size={16} />}
                  </button>
                </th>
                <th className="text-left px-5 py-3 text-charcoal/60 font-semibold">Name</th>
                <th className="text-left px-5 py-3 text-charcoal/60 font-semibold">Class</th>
                <th className="text-left px-5 py-3 text-charcoal/60 font-semibold hidden sm:table-cell">Subject</th>
                <th className="text-left px-5 py-3 text-charcoal/60 font-semibold hidden md:table-cell">Tests Taken</th>
                <th className="text-left px-5 py-3 text-charcoal/60 font-semibold">Status</th>
                <th className="text-right px-5 py-3 text-charcoal/60 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${selected.has(s.id) ? 'bg-red-50/40' : ''}`}>
                  <td className="px-5 py-3">
                    <button onClick={() => toggleSelect(s.id)} className="text-charcoal/30 hover:text-midnight transition-colors">
                      {selected.has(s.id)
                        ? <SquareCheck size={16} className="text-midnight" />
                        : <Square size={16} />}
                    </button>
                  </td>
                  <td className="px-5 py-3 font-medium text-midnight">{s.name}</td>
                  <td className="px-5 py-3 text-charcoal/70">{s.class}{s.section ? ` - ${s.section}` : ''}</td>
                  <td className="px-5 py-3 text-charcoal/60 hidden sm:table-cell">{s.subject || '—'}</td>
                  <td className="px-5 py-3 text-charcoal/60 hidden md:table-cell">{s._count.attempts}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.isActive ? 'bg-forest/10 text-forest' : 'bg-red-50 text-red-600'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => toggleActive(s)} title={s.isActive ? 'Deactivate' : 'Activate'}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-charcoal/40 hover:text-charcoal transition-colors">
                        {s.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                      </button>
                      <button onClick={() => deleteStudent(s.id)} title="Delete"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-charcoal/40 hover:text-red-600 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-charcoal/40 text-sm">
                  {students.length === 0 ? 'No students added yet. Click "Add Student" or "Bulk Import" to start.' : 'No students match your search.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
