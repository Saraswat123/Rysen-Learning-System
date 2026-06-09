'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Search, ToggleLeft, ToggleRight, X, Upload, Download, FileSpreadsheet, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Toast from '@/components/Toast'
import * as XLSX from 'xlsx'

interface Branch { id: string; name: string; location: string }
interface Educator {
  id: string; name: string; email: string; isActive: boolean
  branch: Branch | null
  progress: { passed: boolean; stage: { number: number; title: string } }[]
}

export default function EducatorsPage() {
  const [educators, setEducators] = useState<Educator[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', branchId: '' })
  const [loading, setLoading] = useState(false)
  const [bulkRows, setBulkRows] = useState<{ name: string; email: string }[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Educator | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [e, b] = await Promise.all([
      fetch('/api/educators').then((r) => r.json()),
      fetch('/api/branches').then((r) => r.json()),
    ])
    setEducators(e)
    setBranches(b)
  }

  useEffect(() => { load() }, [])

  async function addEducator(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/educators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setToast({ msg: data.error, type: 'error' }); return }
    setToast({ msg: 'Educator added successfully', type: 'success' })
    setForm({ name: '', email: '', branchId: '' })
    setShowAdd(false)
    load()
  }

  async function deleteEducator(id: string) {
    const res = await fetch(`/api/educators/${id}`, { method: 'DELETE' })
    const data = await res.json()
    setConfirmDelete(null)
    if (!res.ok) { setToast({ msg: data.error ?? 'Delete failed', type: 'error' }); return }
    setToast({ msg: 'Educator deleted', type: 'success' })
    load()
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/educators/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    })
    load()
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = ev.target?.result
      const wb = XLSX.read(data, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })

      const rows = json.map((row) => {
        const keys = Object.keys(row).map((k) => k.toLowerCase().trim())
        const nameKey = Object.keys(row).find((k) => k.toLowerCase().includes('name')) ?? Object.keys(row)[0]
        const emailKey = Object.keys(row).find((k) => k.toLowerCase().includes('email')) ?? Object.keys(row)[1]
        return { name: row[nameKey]?.trim() ?? '', email: row[emailKey]?.trim() ?? '' }
      }).filter((r) => r.name && r.email)

      setBulkRows(rows)
    }
    reader.readAsBinaryString(file)
  }

  async function submitBulk() {
    if (!bulkRows.length) return
    setBulkLoading(true)
    const res = await fetch('/api/educators/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: bulkRows }),
    })
    const data = await res.json()
    setBulkLoading(false)
    setToast({ msg: `Added ${data.added}, skipped ${data.skipped}${data.errors?.length ? ` (${data.errors.length} errors)` : ''}`, type: data.added > 0 ? 'success' : 'error' })
    setShowBulk(false)
    setBulkRows([])
    if (fileRef.current) fileRef.current.value = ''
    load()
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([['Name', 'Email'], ['Priya Sharma', 'priya@rysen.edu.in'], ['Ravi Kumar', 'ravi@rysen.edu.in']])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Educators')
    XLSX.writeFile(wb, 'rysen_educators_template.xlsx')
  }

  const filtered = educators.filter(
    (e) => e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-5xl mx-auto">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-midnight">Educators</h1>
          <p className="text-sm text-charcoal/60">{educators.length} registered educators</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowBulk(true)}>
            <FileSpreadsheet size={16} /> Bulk Import
          </Button>
          <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add Educator</Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-midnight"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cream border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-charcoal">Name</th>
              <th className="text-left px-5 py-3 font-semibold text-charcoal">Email</th>
              <th className="text-left px-5 py-3 font-semibold text-charcoal">Campus</th>
              <th className="text-left px-5 py-3 font-semibold text-charcoal">Progress</th>
              <th className="text-left px-5 py-3 font-semibold text-charcoal">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-gray-50 hover:bg-cream/50 transition-colors">
                <td className="px-5 py-3 font-medium text-charcoal">{e.name}</td>
                <td className="px-5 py-3 text-charcoal/70">{e.email}</td>
                <td className="px-5 py-3">
                  {e.branch ? (
                    <span className="text-charcoal/70">{e.branch.name}</span>
                  ) : (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Unassigned</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const done = e.progress.some((p) => p.stage.number === n && p.passed)
                      return (
                        <div key={n} className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${done ? 'bg-forest text-white' : 'bg-gray-100 text-gray-400'}`}>
                          {n}
                        </div>
                      )
                    })}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.isActive ? 'bg-forest/10 text-forest' : 'bg-red-100 text-red-600'}`}>
                    {e.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive(e.id, e.isActive)} className="text-charcoal/40 hover:text-midnight">
                      {e.isActive ? <ToggleRight size={20} className="text-forest" /> : <ToggleLeft size={20} />}
                    </button>
                    <button onClick={() => setConfirmDelete(e)} className="text-charcoal/30 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-charcoal/40">No educators found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Single Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-midnight">Add Educator</h2>
              <button onClick={() => setShowAdd(false)}><X size={20} className="text-charcoal/60" /></button>
            </div>
            <form onSubmit={addEducator} className="flex flex-col gap-4">
              <Input label="Full Name" placeholder="Teacher name" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              <Input label="Email" type="email" placeholder="teacher@email.com" value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-charcoal">Campus <span className="font-normal text-charcoal/40">(optional — assign later)</span></label>
                <select value={form.branchId}
                  onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-midnight">
                  <option value="">No campus yet</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.location}</option>)}
                </select>
              </div>
              <div className="flex gap-3 mt-2">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)} className="flex-1">Cancel</Button>
                <Button type="submit" loading={loading} className="flex-1">Add Educator</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-midnight mb-2">Delete Educator?</h2>
            <p className="text-sm text-charcoal/70 mb-1">
              This will permanently delete <strong>{confirmDelete.name}</strong> and all their progress data.
            </p>
            <p className="text-xs text-red-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(null)} className="flex-1">Cancel</Button>
              <button
                onClick={() => deleteEducator(confirmDelete.id)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-midnight">Bulk Import Educators</h2>
              <button onClick={() => { setShowBulk(false); setBulkRows([]) }}><X size={20} className="text-charcoal/60" /></button>
            </div>

            <div className="bg-cream rounded-xl p-4 mb-4 text-sm text-charcoal/70">
              Upload CSV or Excel file with columns: <strong>Name</strong> and <strong>Email</strong>.
              Branch can be assigned later per educator.
            </div>

            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 text-sm text-forest font-medium hover:underline"
              >
                <Download size={14} /> Download template
              </button>
            </div>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:border-midnight transition-colors mb-4">
              <Upload size={24} className="text-charcoal/30 mb-2" />
              <span className="text-sm font-medium text-midnight">Click to upload CSV or Excel</span>
              <span className="text-xs text-charcoal/40 mt-1">.csv, .xlsx, .xls supported</span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {bulkRows.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-midnight">{bulkRows.length} educators ready to import</span>
                  <button onClick={() => { setBulkRows([]); if (fileRef.current) fileRef.current.value = '' }}
                    className="text-xs text-red-500 hover:underline">Clear</button>
                </div>
                <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-cream sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-charcoal">#</th>
                        <th className="text-left px-3 py-2 font-semibold text-charcoal">Name</th>
                        <th className="text-left px-3 py-2 font-semibold text-charcoal">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkRows.map((r, i) => (
                        <tr key={i} className="border-t border-gray-50">
                          <td className="px-3 py-1.5 text-charcoal/40">{i + 1}</td>
                          <td className="px-3 py-1.5 text-charcoal">{r.name}</td>
                          <td className="px-3 py-1.5 text-charcoal/70">{r.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => { setShowBulk(false); setBulkRows([]) }} className="flex-1">
                Cancel
              </Button>
              <Button onClick={submitBulk} loading={bulkLoading} disabled={!bulkRows.length} className="flex-1">
                <Upload size={16} /> Import {bulkRows.length > 0 ? `${bulkRows.length} Educators` : ''}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
