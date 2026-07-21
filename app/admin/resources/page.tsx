'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Plus, Trash2, Eye, EyeOff, Pin, PinOff, ExternalLink, X,
  FileText, FileSpreadsheet, Video, Link as LinkIcon, FolderOpen, File,
  Search, Upload, Sparkles,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Toast from '@/components/Toast'

interface Branch { id: string; name: string; location: string }
interface Resource {
  id: string; title: string; description: string | null; url: string | null
  type: string; category: string; isPublished: boolean; isPinned: boolean
  branchId: string | null; branch: { id: string; name: string } | null
  createdAt: string
}

const RESOURCE_TYPES = [
  { value: 'DRIVE', label: 'Google Drive', icon: FolderOpen, color: '#4285F4' },
  { value: 'SHEET', label: 'Google Sheet', icon: FileSpreadsheet, color: '#34A853' },
  { value: 'DOC', label: 'Google Doc', icon: FileText, color: '#4285F4' },
  { value: 'VIDEO', label: 'Video', icon: Video, color: '#FF0000' },
  { value: 'PDF', label: 'PDF', icon: File, color: '#EA4335' },
  { value: 'LINK', label: 'Link', icon: LinkIcon, color: '#6B7280' },
]

const CATEGORIES = ['General', 'STEM', 'Training', 'Policy', 'Templates', 'Marketing', 'Assessment', 'Curriculum']

function TypeIcon({ type, size = 16 }: { type: string; size?: number }) {
  const t = RESOURCE_TYPES.find((r) => r.value === type) ?? RESOURCE_TYPES[RESOURCE_TYPES.length - 1]
  const Icon = t.icon
  return <Icon size={size} style={{ color: t.color }} />
}

function typeBadge(type: string) {
  const t = RESOURCE_TYPES.find((r) => r.value === type) ?? RESOURCE_TYPES[RESOURCE_TYPES.length - 1]
  return t.label
}

const EMPTY_FORM = { title: '', description: '', url: '', type: 'LINK', category: 'General', branchId: '', isPublished: true, isPinned: false }

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Resource | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [inputMode, setInputMode] = useState<'link' | 'upload'>('link')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [rr, br] = await Promise.all([fetch('/api/resources'), fetch('/api/branches')])
    if (rr.ok) setResources(await rr.json())
    if (br.ok) setBranches(await br.json())
  }
  useEffect(() => { load() }, [])

  function openCreate() { setForm({ ...EMPTY_FORM }); setEditId(null); setUploadFile(null); setInputMode('link'); setShowCreate(true) }
  function openEdit(r: Resource) {
    setForm({ title: r.title, description: r.description ?? '', url: r.url ?? '', type: r.type, category: r.category, branchId: r.branchId ?? '', isPublished: r.isPublished, isPinned: r.isPinned })
    setEditId(r.id)
    setShowCreate(true)
  }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)

    let finalUrl = form.url.trim() || null

    // Upload file first if in upload mode
    if (inputMode === 'upload' && uploadFile) {
      setUploading(true)
      const fd = new FormData()
      fd.append('file', uploadFile)
      const upRes = await fetch('/api/resources/upload', { method: 'POST', body: fd })
      const upData = await upRes.json()
      setUploading(false)
      if (!upRes.ok) { setToast({ msg: upData.error ?? 'Upload failed', type: 'error' }); setSaving(false); return }
      finalUrl = upData.url
    }

    const payload = { ...form, url: finalUrl, branchId: form.branchId || null, description: form.description.trim() || null }
    const res = editId
      ? await fetch(`/api/resources/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/resources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) {
      setToast({ msg: editId ? 'Resource updated' : 'Resource added', type: 'success' })
      setShowCreate(false); setUploadFile(null)
      load()
    } else {
      const err = await res.json().catch(() => ({}))
      setToast({ msg: err.error ?? 'Failed', type: 'error' })
    }
    setSaving(false)
  }

  async function seedStemResources() {
    const res = await fetch('/api/admin/setup-stem-resources', { method: 'POST' })
    const data = await res.json()
    if (res.ok) { setToast({ msg: `STEM resources seeded: ${data.results.filter((r: {status: string}) => r.status === 'created').length} added`, type: 'success' }); load() }
    else setToast({ msg: data.error ?? 'Failed', type: 'error' })
  }

  async function toggle(r: Resource, field: 'isPublished' | 'isPinned') {
    await fetch(`/api/resources/${r.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: !r[field] }) })
    load()
  }

  async function del(r: Resource) {
    const res = await fetch(`/api/resources/${r.id}`, { method: 'DELETE' })
    if (res.ok) { setToast({ msg: 'Deleted', type: 'success' }); setConfirmDelete(null); load() }
    else setToast({ msg: 'Failed to delete', type: 'error' })
  }

  const categories = Array.from(new Set(['All', ...CATEGORIES, ...resources.map((r) => r.category)])).filter((c, i, a) => a.indexOf(c) === i)

  const filtered = resources.filter((r) => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !(r.description ?? '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterCat && filterCat !== 'All' && r.category !== filterCat) return false
    if (filterBranch && r.branchId !== filterBranch) return false
    return true
  })

  const grouped = filtered.reduce<Record<string, Resource[]>>((acc, r) => {
    ;(acc[r.category] = acc[r.category] ?? []).push(r)
    return acc
  }, {})

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-midnight">Resources</h1>
          <p className="text-sm text-charcoal/60 mt-0.5">{resources.length} resources across {Object.keys(grouped).length} categories</p>
        </div>
        <div className="flex gap-2">
          <button onClick={seedStemResources}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-forest/30 text-forest hover:bg-forest/5 transition-colors">
            <Sparkles size={13} /> Seed STEM Resources
          </button>
          <Button onClick={openCreate} size="sm"><Plus size={14} /> Add Resource</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/30" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search resources…"
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight/20" />
        </div>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-midnight/20">
          <option value="">All Categories</option>
          {categories.filter((c) => c !== 'All').map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-midnight/20">
          <option value="">All Campuses</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Resource groups */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-charcoal/30">
          <FolderOpen size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No resources yet. Add your first resource.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-3 px-1">{cat}</h2>
            <div className="grid gap-3">
              {items.map((r) => (
                <div key={r.id} className={`bg-white rounded-xl border ${r.isPinned ? 'border-gold' : 'border-gray-100'} overflow-hidden`}>
                  <div className="flex items-stretch">
                    <div className="w-1 flex-shrink-0 rounded-l-xl" style={{ backgroundColor: RESOURCE_TYPES.find((t) => t.value === r.type)?.color ?? '#6B7280' }} />
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="mt-0.5 flex-shrink-0"><TypeIcon type={r.type} size={18} /></div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-sm text-midnight truncate">{r.title}</h3>
                              {r.isPinned && <span className="text-[10px] font-bold bg-gold/20 text-olive px-1.5 py-0.5 rounded-full">PINNED</span>}
                              {!r.isPublished && <span className="text-[10px] font-bold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">HIDDEN</span>}
                              {r.branch && <span className="text-[10px] font-medium bg-midnight/5 text-midnight px-1.5 py-0.5 rounded-full">{r.branch.name}</span>}
                              {!r.branchId && <span className="text-[10px] font-medium bg-forest/5 text-forest px-1.5 py-0.5 rounded-full">All Campuses</span>}
                            </div>
                            {r.description && <p className="text-xs text-charcoal/50 mt-0.5 line-clamp-1">{r.description}</p>}
                            {r.url ? (
                              <a href={r.url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-midnight/50 hover:text-midnight truncate block mt-1 max-w-xs">
                                {r.url}
                              </a>
                            ) : (
                              <span className="text-xs text-charcoal/30 block mt-1">No link — upload pending</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {r.url && (
                            <a href={r.url} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 text-charcoal/30 hover:text-midnight hover:bg-midnight/5 rounded-lg transition-colors">
                              <ExternalLink size={13} />
                            </a>
                          )}
                          <button onClick={() => toggle(r, 'isPinned')}
                            className={`p-1.5 rounded-lg transition-colors ${r.isPinned ? 'text-gold hover:bg-gold/10' : 'text-charcoal/30 hover:text-charcoal hover:bg-gray-50'}`}>
                            {r.isPinned ? <Pin size={13} /> : <PinOff size={13} />}
                          </button>
                          <button onClick={() => toggle(r, 'isPublished')}
                            className={`p-1.5 rounded-lg transition-colors ${r.isPublished ? 'text-forest hover:bg-forest/10' : 'text-charcoal/30 hover:text-charcoal hover:bg-gray-50'}`}>
                            {r.isPublished ? <Eye size={13} /> : <EyeOff size={13} />}
                          </button>
                          <button onClick={() => openEdit(r)}
                            className="p-1.5 text-charcoal/30 hover:text-midnight hover:bg-midnight/5 rounded-lg transition-colors text-xs font-medium px-2">
                            Edit
                          </button>
                          <button onClick={() => setConfirmDelete(r)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Create / Edit modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-midnight">{editId ? 'Edit Resource' : 'Add Resource'}</h3>
              <button onClick={() => setShowCreate(false)} className="text-charcoal/40 hover:text-midnight"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <Input label="Title *" placeholder="e.g. STEM Data Sheet 2024"
                value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              <div>
                <label className="text-sm font-semibold text-charcoal mb-1 block">Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {RESOURCE_TYPES.map((t) => {
                    const Icon = t.icon
                    return (
                      <button key={t.value} onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${form.type === t.value ? 'border-midnight bg-midnight/5 text-midnight' : 'border-gray-200 text-charcoal/60 hover:border-gray-300'}`}>
                        <Icon size={13} style={{ color: form.type === t.value ? t.color : undefined }} /> {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* Link or Upload toggle */}
              <div>
                <div className="flex gap-1 mb-2 p-1 bg-gray-100 rounded-xl w-fit">
                  <button type="button" onClick={() => setInputMode('link')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${inputMode === 'link' ? 'bg-white text-midnight shadow-sm' : 'text-charcoal/50 hover:text-charcoal'}`}>
                    <LinkIcon size={11} /> Paste Link
                  </button>
                  <button type="button" onClick={() => setInputMode('upload')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${inputMode === 'upload' ? 'bg-white text-midnight shadow-sm' : 'text-charcoal/50 hover:text-charcoal'}`}>
                    <Upload size={11} /> Upload File
                  </button>
                </div>
                {inputMode === 'link' ? (
                  <Input label="" placeholder="https://drive.google.com/…"
                    value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
                ) : (
                  <div>
                    <input ref={fileRef} type="file" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) setUploadFile(f) }} />
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center gap-2 text-charcoal/40 hover:border-midnight/30 hover:text-midnight transition-colors">
                      <Upload size={20} />
                      {uploadFile ? (
                        <span className="text-sm font-semibold text-forest">{uploadFile.name} ({(uploadFile.size / 1024).toFixed(0)} KB)</span>
                      ) : (
                        <span className="text-sm">Click to choose file (PDF, DOC, image, etc.) · Max 50MB</span>
                      )}
                    </button>
                    {uploading && <p className="text-xs text-midnight/50 mt-1 text-center animate-pulse">Uploading…</p>}
                  </div>
                )}
              </div>
              <Input label="Description" placeholder="Brief note on what this resource contains"
                value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-charcoal mb-1 block">Category</label>
                  <input list="cat-list" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    placeholder="e.g. STEM" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight/20" />
                  <datalist id="cat-list">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <label className="text-sm font-semibold text-charcoal mb-1 block">Campus (optional)</label>
                  <select value={form.branchId} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight/20">
                    <option value="">All Campuses</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.location}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
                    className="w-4 h-4 accent-midnight" />
                  <span className="text-sm font-medium text-charcoal">Visible to educators</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))}
                    className="w-4 h-4 accent-midnight" />
                  <span className="text-sm font-medium text-charcoal">Pin to top</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="ghost" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button className="flex-1" loading={saving || uploading} onClick={save} disabled={!form.title.trim() || (inputMode === 'link' ? !form.url.trim() : !uploadFile)}>
                {editId ? 'Save Changes' : 'Add Resource'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-midnight mb-2">Delete Resource?</h3>
            <p className="text-sm text-charcoal/60 mb-6">
              <strong className="text-midnight">"{confirmDelete.title}"</strong> will be permanently removed.
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <button onClick={() => del(confirmDelete)}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-sm transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
