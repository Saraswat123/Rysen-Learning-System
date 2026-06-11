'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'

interface Educator {
  id: string; name: string; email: string
  progress: { passed: boolean; stage: { number: number; title: string } }[]
}

interface Stage { id: string; number: number; title: string }

export default function CampusProgressPage() {
  const [educators, setEducators] = useState<Educator[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/principals/campus').then((r) => r.json()).then((data) => {
      setEducators(data.educators ?? [])
      setStages(data.stages ?? [])
      setLoading(false)
    })
  }, [])

  const filtered = educators.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase())
  )

  const passedAll = educators.filter((e) => e.progress.filter((p) => p.passed).length >= stages.length).length

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-olive border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-midnight">Campus Progress</h1>
        <p className="text-sm text-charcoal/60">{educators.length} educators · {passedAll} fully certified</p>
      </div>

      {/* Stage header stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {stages.map((s) => {
          const count = educators.filter((e) => e.progress.some((p) => p.stage.number === s.number && p.passed)).length
          const pct = educators.length > 0 ? Math.round((count / educators.length) * 100) : 0
          return (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
              <div className="text-lg font-bold text-midnight">{pct}%</div>
              <div className="text-xs text-charcoal/50">Stage {s.number}</div>
              <div className="text-xs text-charcoal/40 mt-0.5">{count}/{educators.length}</div>
            </div>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-olive/50"
          placeholder="Search educators..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cream border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-charcoal">Educator</th>
              {stages.map((s) => (
                <th key={s.id} className="text-center px-3 py-3 font-semibold text-charcoal text-xs">S{s.number}</th>
              ))}
              <th className="text-center px-5 py-3 font-semibold text-charcoal">Progress</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((edu) => {
              const passedCount = edu.progress.filter((p) => p.passed).length
              const pct = stages.length > 0 ? Math.round((passedCount / stages.length) * 100) : 0
              return (
                <tr key={edu.id} className="border-b border-gray-50 hover:bg-cream/50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-charcoal">{edu.name}</p>
                    <p className="text-xs text-charcoal/40">{edu.email}</p>
                  </td>
                  {stages.map((s) => {
                    const done = edu.progress.some((p) => p.stage.number === s.number && p.passed)
                    return (
                      <td key={s.id} className="text-center px-3 py-3">
                        <div className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center text-xs font-bold ${done ? 'bg-forest text-white' : 'bg-gray-100 text-gray-400'}`}>
                          {done ? '✓' : s.number}
                        </div>
                      </td>
                    )
                  })}
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-forest rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-midnight w-8">{pct}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={stages.length + 2} className="text-center py-10 text-charcoal/40">No educators found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
