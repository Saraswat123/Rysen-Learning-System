'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, X, Trash2, Search, ToggleLeft, ToggleRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Toast from '@/components/Toast'

interface Branch { id: string; name: string; location: string }
interface Principal {
  id: string; name: string; email: string; isActive: boolean
  branch: Branch | null
}

export default function PrincipalsPage() {
  const [principals, setPrincipals] = useState<Principal[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', branchId: '' })
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Principal | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  async function load() {
    const [p, b] = await Promise.all([
      fetch('/api/principals').then((r) => r.json()),
      fetch('/api/branches').then((r) => r.json()),
    ])
    setPrincipals(Array.isArray(p) ? p : [])
    setBranches(b)
  }

  useEffect(() => { load() }, [])

  async function addPrincipal(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/principals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setToast({ msg: data.error, type: 'error' }); return }
    setToast({ msg: 'Principal added', type: 'success' })
    setForm({ name: '', email: '', branchId: '' })
    setShowAdd(false)
    load()
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/principals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    })
    load()
  }

  async function deletePrincipal(id: string) {
    await fetch(`/api/principals/${id}`, { method: 'DELETE' })
    setConfirmDelete(null)
    setToast({ msg: 'Principal deleted', type: 'success' })
    load()
  }

  const filtered = principals.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-4xl mx-auto">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-midnight">Principals & Center Heads</h1>
          <p className="text-sm text-charcoal/60">{principals.length} registered</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add Principal</Button>
      </div>

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-midnight"
          placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cream border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-charcoal">Name</th>
              <th className="text-left px-5 py-3 font-semibold text-charcoal">Email</th>
              <th className="text-left px-5 py-3 font-semibold text-charcoal">Campus</th>
              <th className="text-left px-5 py-3 font-semibold text-charcoal">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-cream/50">
                <td className="px-5 py-3 font-medium text-charcoal">{p.name}</td>
                <td className="px-5 py-3 text-charcoal/70">{p.email}</td>
                <td className="px-5 py-3">
                  {p.branch ? (
                    <span className="text-charcoal/70">{p.branch.name}</span>
                  ) : (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Unassigned</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.isActive ? 'bg-forest/10 text-forest' : 'bg-red-100 text-red-600'}`}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive(p.id, p.isActive)} className="text-charcoal/40 hover:text-midnight">
                      {p.isActive ? <ToggleRight size={20} className="text-forest" /> : <ToggleLeft size={20} />}
                    </button>
                    <button onClick={() => setConfirmDelete(p)} className="text-charcoal/30 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-charcoal/40">No principals found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-midnight">Add Principal / Center Head</h2>
              <button onClick={() => setShowAdd(false)}><X size={20} className="text-charcoal/60" /></button>
            </div>
            <form onSubmit={addPrincipal} className="flex flex-col gap-4">
              <Input label="Full Name" placeholder="Principal name" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              <Input label="Email" type="email" placeholder="principal@rysen.edu.in" value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-charcoal">Campus</label>
                <select value={form.branchId} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-midnight text-sm">
                  <option value="">Select campus</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.location}</option>)}
                </select>
              </div>
              <div className="flex gap-3 mt-2">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)} className="flex-1">Cancel</Button>
                <Button type="submit" loading={loading} className="flex-1">Add Principal</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-midnight mb-2">Delete Principal?</h2>
            <p className="text-sm text-charcoal/70 mb-5">Permanently delete <strong>{confirmDelete.name}</strong> and all progress data.</p>
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(null)} className="flex-1">Cancel</Button>
              <button onClick={() => deletePrincipal(confirmDelete.id)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl text-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
