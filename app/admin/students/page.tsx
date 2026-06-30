'use client'

import { useState, useEffect } from 'react'
import { Download, Plus, Search, Trash2, UserCheck, UserX } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface Branch { id: string; name: string; location: string }
interface Student {
  id: string; name: string; class: string; section: string
  subject: string; isActive: boolean; createdAt: string
  branch: Branch | null; _count: { attempts: number }
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', class: '', section: '', subject: '', branchId: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterClass) params.set('class', filterClass)
    if (filterBranch) params.set('branchId', filterBranch)
    const [s, b] = await Promise.all([
      fetch(`/api/students?${params}`).then((r) => r.json()),
      fetch('/api/branches').then((r) => r.json()),
    ])
    setStudents(Array.isArray(s) ? s : [])
    setBranches(Array.isArray(b) ? b : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filterClass, filterBranch]) // eslint-disable-line

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
    setForm({ name: '', class: '', section: '', subject: '', branchId: '' })
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
    if (!confirm('Delete this student? All test attempts will be lost.')) return
    await fetch(`/api/students/${id}`, { method: 'DELETE' })
    load()
  }

  function exportCSV() {
    window.open('/api/students/export', '_blank')
  }

  const filtered = students.filter((s) =>
    search ? s.name.toLowerCase().includes(search.toLowerCase()) || s.class.includes(search) : true
  )

  const classes = [...new Set(students.map((s) => s.class))].sort()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-midnight">Students</h1>
          <p className="text-sm text-charcoal/60 mt-0.5">{students.length} total students</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportCSV} size="sm" className="bg-forest text-white flex items-center gap-2">
            <Download size={15} /> Export CSV
          </Button>
          <Button onClick={() => setShowAdd(true)} size="sm" className="flex items-center gap-2">
            <Plus size={15} /> Add Student
          </Button>
        </div>
      </div>

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
                <label className="text-sm font-semibold text-charcoal">Branch</label>
                <select value={form.branchId} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight">
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
        <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-midnight">
          <option value="">All Branches</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
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
                <th className="text-left px-5 py-3 text-charcoal/60 font-semibold">Name</th>
                <th className="text-left px-5 py-3 text-charcoal/60 font-semibold">Class</th>
                <th className="text-left px-5 py-3 text-charcoal/60 font-semibold hidden sm:table-cell">Subject</th>
                <th className="text-left px-5 py-3 text-charcoal/60 font-semibold hidden md:table-cell">Branch</th>
                <th className="text-left px-5 py-3 text-charcoal/60 font-semibold hidden lg:table-cell">Tests</th>
                <th className="text-left px-5 py-3 text-charcoal/60 font-semibold">Status</th>
                <th className="text-right px-5 py-3 text-charcoal/60 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-midnight">{s.name}</td>
                  <td className="px-5 py-3 text-charcoal/70">
                    {s.class}{s.section ? ` - ${s.section}` : ''}
                  </td>
                  <td className="px-5 py-3 text-charcoal/60 hidden sm:table-cell">{s.subject || '—'}</td>
                  <td className="px-5 py-3 text-charcoal/60 hidden md:table-cell">{s.branch?.name || '—'}</td>
                  <td className="px-5 py-3 text-charcoal/60 hidden lg:table-cell">{s._count.attempts}</td>
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
                <tr><td colSpan={7} className="text-center py-12 text-charcoal/40 text-sm">No students found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
