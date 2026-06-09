'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, X, Shield } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Toast from '@/components/Toast'

interface Admin { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string }

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [me, setMe] = useState<{ id: string; role: string } | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '' })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  async function load() {
    const [a, m] = await Promise.all([
      fetch('/api/admins').then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.json()),
    ])
    setAdmins(Array.isArray(a) ? a : [])
    setMe(m.user)
  }

  useEffect(() => { load() }, [])

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setToast({ msg: data.error, type: 'error' }); return }
    setToast({ msg: 'Admin added', type: 'success' })
    setForm({ name: '', email: '' })
    setShowAdd(false)
    load()
  }

  async function removeAdmin(id: string) {
    if (!confirm('Deactivate this admin?')) return
    await fetch(`/api/admins/${id}`, { method: 'DELETE' })
    setToast({ msg: 'Admin deactivated', type: 'success' })
    load()
  }

  async function promoteAdmin(id: string, toRole: 'SUPER_ADMIN' | 'ADMIN') {
    const label = toRole === 'SUPER_ADMIN' ? 'Promote to Super Admin?' : 'Demote to Admin?'
    if (!confirm(label)) return
    const res = await fetch(`/api/admins/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: toRole }),
    })
    const data = await res.json()
    if (!res.ok) { setToast({ msg: data.error, type: 'error' }); return }
    setToast({ msg: toRole === 'SUPER_ADMIN' ? 'Promoted to Super Admin' : 'Demoted to Admin', type: 'success' })
    load()
  }

  const isSuperAdmin = me?.role === 'SUPER_ADMIN'

  return (
    <div className="max-w-3xl mx-auto">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-midnight">Admin Users</h1>
          <p className="text-sm text-charcoal/60">Only Super Admin can manage admin accounts</p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add Admin</Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {admins.map((admin) => (
          <div key={admin.id} className="flex items-center justify-between px-5 py-4 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${admin.role === 'SUPER_ADMIN' ? 'bg-gold' : 'bg-midnight/10'}`}>
                <Shield size={16} className={admin.role === 'SUPER_ADMIN' ? 'text-midnight' : 'text-midnight/60'} />
              </div>
              <div>
                <p className="text-sm font-semibold text-charcoal flex items-center gap-2">
                  {admin.name}
                  {admin.role === 'SUPER_ADMIN' && (
                    <span className="text-xs bg-gold text-midnight px-2 py-0.5 rounded-full font-medium">Super Admin</span>
                  )}
                </p>
                <p className="text-xs text-charcoal/50">{admin.email}</p>
              </div>
            </div>
            {isSuperAdmin && admin.id !== me?.id && (
              <div className="flex items-center gap-1">
                {admin.role === 'ADMIN' && (
                  <button
                    onClick={() => promoteAdmin(admin.id, 'SUPER_ADMIN')}
                    title="Promote to Super Admin"
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-gold/20 text-midnight hover:bg-gold/40 font-medium transition-colors"
                  >
                    <Shield size={12} /> Promote
                  </button>
                )}
                {admin.role === 'SUPER_ADMIN' && (
                  <button
                    onClick={() => promoteAdmin(admin.id, 'ADMIN')}
                    title="Demote to Admin"
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-charcoal/10 text-charcoal hover:bg-charcoal/20 font-medium transition-colors"
                  >
                    Demote
                  </button>
                )}
                {admin.role !== 'SUPER_ADMIN' && (
                  <button onClick={() => removeAdmin(admin.id)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {admins.length === 0 && (
          <p className="text-center py-12 text-charcoal/40 text-sm">No admins found</p>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-midnight">Add Admin</h2>
              <button onClick={() => setShowAdd(false)}><X size={20} className="text-charcoal/60" /></button>
            </div>
            <form onSubmit={addAdmin} className="flex flex-col gap-4">
              <Input label="Full Name" placeholder="Admin name" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              <Input label="Email" type="email" placeholder="admin@rysen.edu.in" value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
              <div className="flex gap-3 mt-2">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)} className="flex-1">Cancel</Button>
                <Button type="submit" loading={loading} className="flex-1">Add Admin</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
