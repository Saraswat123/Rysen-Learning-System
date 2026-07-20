'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, Search, FolderOpen, FileText, FileSpreadsheet, Video, Link as LinkIcon, File, Pin } from 'lucide-react'

interface Resource {
  id: string; title: string; description: string | null; url: string
  type: string; category: string; isPublished: boolean; isPinned: boolean
  branchId: string | null; branch: { id: string; name: string } | null
  createdAt: string
}

const TYPE_META: Record<string, { label: string; icon: React.ComponentType<{ size: number; className?: string }>; color: string; bg: string }> = {
  DRIVE: { label: 'Drive', icon: FolderOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
  SHEET: { label: 'Sheet', icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-50' },
  DOC: { label: 'Doc', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
  VIDEO: { label: 'Video', icon: Video, color: 'text-red-500', bg: 'bg-red-50' },
  PDF: { label: 'PDF', icon: File, color: 'text-red-600', bg: 'bg-red-50' },
  LINK: { label: 'Link', icon: LinkIcon, color: 'text-charcoal', bg: 'bg-gray-50' },
}

function ResourceCard({ r }: { r: Resource }) {
  const meta = TYPE_META[r.type] ?? TYPE_META['LINK']
  const Icon = meta.icon
  return (
    <a href={r.url} target="_blank" rel="noopener noreferrer"
      className="group bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-4 hover:border-midnight/20 hover:shadow-md transition-all">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
        <Icon size={18} className={meta.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-sm text-midnight group-hover:text-midnight/80 truncate">{r.title}</h3>
          {r.isPinned && <span className="text-[10px] font-bold text-olive bg-gold/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Pin size={8} /> Pinned</span>}
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>{meta.label}</span>
        </div>
        {r.description && <p className="text-xs text-charcoal/50 mt-1 line-clamp-2">{r.description}</p>}
        <p className="text-xs text-charcoal/30 mt-1 truncate">{r.url}</p>
      </div>
      <ExternalLink size={14} className="text-charcoal/20 group-hover:text-midnight flex-shrink-0 mt-1 transition-colors" />
    </a>
  )
}

export default function EducatorResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState('')

  useEffect(() => {
    fetch('/api/resources').then((r) => r.json()).then((data) => {
      setResources(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [])

  const types = Array.from(new Set(resources.map((r) => r.type))).filter(Boolean)

  const filtered = resources.filter((r) => {
    if (!r.isPublished) return false
    if (activeType && r.type !== activeType) return false
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !(r.description ?? '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const pinned = filtered.filter((r) => r.isPinned)
  const grouped = filtered.filter((r) => !r.isPinned).reduce<Record<string, Resource[]>>((acc, r) => {
    ;(acc[r.category] = acc[r.category] ?? []).push(r)
    return acc
  }, {})

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-midnight">Resources</h1>
        <p className="text-sm text-charcoal/60 mt-0.5">All training materials, data sheets, docs and links for your work</p>
      </div>

      {/* Search + type filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/30" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search resources…"
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight/20" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setActiveType('')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${!activeType ? 'bg-midnight text-white' : 'bg-gray-100 text-charcoal/60 hover:bg-gray-200'}`}>
            All
          </button>
          {types.map((t) => {
            const meta = TYPE_META[t] ?? TYPE_META['LINK']
            const Icon = meta.icon
            return (
              <button key={t} onClick={() => setActiveType(t)}
                className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${activeType === t ? 'bg-midnight text-white' : 'bg-gray-100 text-charcoal/60 hover:bg-gray-200'}`}>
                <Icon size={11} className={activeType === t ? '' : meta.color} /> {meta.label}
              </button>
            )
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-charcoal/30">
          <FolderOpen size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">{search ? 'No resources match your search.' : 'No resources available yet.'}</p>
        </div>
      ) : (
        <>
          {/* Pinned */}
          {pinned.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-gold mb-3 px-1 flex items-center gap-1.5">
                <Pin size={10} /> Pinned
              </h2>
              <div className="grid gap-3">
                {pinned.map((r) => <ResourceCard key={r.id} r={r} />)}
              </div>
            </div>
          )}

          {/* By category */}
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-3 px-1">{cat}</h2>
              <div className="grid gap-3">
                {items.map((r) => <ResourceCard key={r.id} r={r} />)}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
