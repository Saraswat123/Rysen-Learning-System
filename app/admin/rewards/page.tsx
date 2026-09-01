'use client'

import { useState, useEffect } from 'react'
import {
  Trophy, Medal, Award, Lock, CheckCircle2, ChevronDown, ChevronUp, Save, Loader2,
  Sparkles, Settings, Plus, X, Pencil, Trash2, UserPlus, Square, SquareCheck, Users,
} from 'lucide-react'

interface Criterion { id: string; label: string; order: number; isAutoTest: boolean }
interface Category { id: string; name: string; memberCount: number; criteria: Criterion[] }
interface ScoreEntry { criterionId: string; label: string; isAutoTest: boolean; score: number }
interface EducatorRow {
  userId: string; name: string; email: string; avatarUrl: string | null
  branch: { id: string; name: string } | null
  scores: ScoreEntry[]; average: number; rank: number
  comment: string | null; finalized: boolean; hasRating: boolean
}
interface MemberInfo { userId: string; name: string; email: string; branch: string | null; avatarUrl?: string | null }

function currentPeriod() { return new Date().toISOString().slice(0, 7) }
function periodLabel(period: string) { return new Date(`${period}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) }

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <div className="w-9 h-9 rounded-full bg-gold flex items-center justify-center"><Trophy size={16} className="text-midnight" /></div>
  if (rank === 2) return <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center"><Medal size={16} className="text-white" /></div>
  if (rank === 3) return <div className="w-9 h-9 rounded-full bg-amber-600 flex items-center justify-center"><Medal size={16} className="text-white" /></div>
  return <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-charcoal/50">{rank}</div>
}

export default function AdminRewardsPage() {
  const [period, setPeriod] = useState(currentPeriod())
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState<string>('')
  const [rows, setRows] = useState<EducatorRow[]>([])
  const [criteria, setCriteria] = useState<Criterion[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, { scores?: Record<string, number>; comment?: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [finalizing, setFinalizing] = useState(false)
  const [toast, setToast] = useState('')

  // Category management modal
  const [showManage, setShowManage] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatGroupName, setNewCatGroupName] = useState('')
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [newCriterionLabel, setNewCriterionLabel] = useState('')

  // Member management modal
  const [showMembers, setShowMembers] = useState(false)
  const [members, setMembers] = useState<MemberInfo[]>([])
  const [candidates, setCandidates] = useState<MemberInfo[]>([])
  const [selectedToRemove, setSelectedToRemove] = useState<Set<string>>(new Set())
  const [addCandidateId, setAddCandidateId] = useState('')

  async function loadCategories() {
    const res = await fetch('/api/admin/recognition-categories')
    const data = await res.json()
    setCategories(data)
    if (!categoryId && data.length > 0) setCategoryId(data[0].id)
    return data as Category[]
  }

  async function loadRatings() {
    if (!categoryId) return
    setLoading(true)
    const res = await fetch(`/api/admin/educator-ratings?categoryId=${categoryId}&period=${period}`)
    const data = await res.json()
    setRows(data.educators ?? [])
    setCriteria(data.criteria ?? [])
    setDrafts({})
    setLoading(false)
  }

  useEffect(() => { loadCategories() }, []) // eslint-disable-line
  useEffect(() => { if (categoryId) loadRatings() }, [categoryId, period]) // eslint-disable-line

  function getDraftScore(row: EducatorRow, criterionId: string, fallback: number) {
    return drafts[row.userId]?.scores?.[criterionId] ?? fallback
  }
  function setDraftScore(userId: string, criterionId: string, value: number) {
    setDrafts((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], scores: { ...prev[userId]?.scores, [criterionId]: Math.max(0, Math.min(10, value)) } },
    }))
  }
  function setDraftComment(userId: string, value: string) {
    setDrafts((prev) => ({ ...prev, [userId]: { ...prev[userId], comment: value } }))
  }

  async function saveRow(row: EducatorRow) {
    setSaving(row.userId)
    const d = drafts[row.userId] ?? {}
    const scores: Record<string, number> = {}
    for (const c of row.scores.filter((s) => !s.isAutoTest)) {
      scores[c.criterionId] = d.scores?.[c.criterionId] ?? c.score
    }
    await fetch('/api/admin/educator-ratings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: row.userId, categoryId, period, scores, comment: d.comment ?? row.comment }),
    })
    setSaving(null)
    setToast(`Saved ${row.name}'s scores`)
    setTimeout(() => setToast(''), 2500)
    loadRatings()
  }

  async function finalizeMonth() {
    const catName = categories.find((c) => c.id === categoryId)?.name ?? 'this category'
    if (!confirm(`Finalize ${catName} — ${periodLabel(period)}? This locks scores and notifies every educator of their rank + certificate eligibility.`)) return
    setFinalizing(true)
    await fetch('/api/admin/educator-ratings/finalize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId, period }),
    })
    setFinalizing(false)
    setToast('Month finalized — educators notified')
    setTimeout(() => setToast(''), 3000)
    loadRatings()
  }

  // ── Category management ──
  async function createCategory() {
    if (!newCatName.trim() || !newCatGroupName.trim()) return
    const res = await fetch('/api/admin/recognition-categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCatName.trim(), groupName: newCatGroupName.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setToast(data.error ?? 'Failed to create category'); return }
    setNewCatName(''); setNewCatGroupName('')
    const cats = await loadCategories()
    setCategoryId(data.id)
    setToast(`Created "${data.name}" — now add members`)
    setTimeout(() => setToast(''), 3000)
    void cats
  }

  async function saveCategoryName(id: string) {
    if (!editCatName.trim()) return
    await fetch(`/api/admin/recognition-categories/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editCatName.trim() }),
    })
    setEditingCatId(null)
    loadCategories()
  }

  async function deleteCategory(id: string, name: string) {
    if (!confirm(`Delete recognition category "${name}"? All its ratings will be permanently lost. The educator group itself is not deleted.`)) return
    await fetch(`/api/admin/recognition-categories/${id}`, { method: 'DELETE' })
    if (categoryId === id) setCategoryId('')
    loadCategories()
  }

  async function addCriterion() {
    if (!newCriterionLabel.trim() || !categoryId) return
    await fetch(`/api/admin/recognition-categories/${categoryId}/criteria`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newCriterionLabel.trim() }),
    })
    setNewCriterionLabel('')
    loadCategories(); loadRatings()
  }

  async function deleteCriterion(criterionId: string, label: string) {
    if (!confirm(`Delete rating category "${label}"? Existing scores for it will no longer count.`)) return
    await fetch(`/api/admin/recognition-categories/${categoryId}/criteria/${criterionId}`, { method: 'DELETE' })
    loadCategories(); loadRatings()
  }

  // ── Member management ──
  async function openMembers() {
    setShowMembers(true)
    setSelectedToRemove(new Set())
    const res = await fetch(`/api/admin/recognition-categories/${categoryId}/members`)
    const data = await res.json()
    setMembers(data.members ?? [])
    setCandidates(data.candidates ?? [])
  }

  async function addMember() {
    if (!addCandidateId) return
    await fetch(`/api/admin/recognition-categories/${categoryId}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: addCandidateId }),
    })
    setAddCandidateId('')
    openMembers(); loadCategories(); loadRatings()
  }

  async function removeSelectedMembers() {
    if (selectedToRemove.size === 0) return
    if (!confirm(`Remove ${selectedToRemove.size} educator(s) from this category?`)) return
    await fetch(`/api/admin/recognition-categories/${categoryId}/members`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: [...selectedToRemove] }),
    })
    openMembers(); loadCategories(); loadRatings()
  }

  function toggleRemoveSelect(userId: string) {
    setSelectedToRemove((prev) => {
      const next = new Set(prev)
      next.has(userId) ? next.delete(userId) : next.add(userId)
      return next
    })
  }

  const currentCategory = categories.find((c) => c.id === categoryId)
  const anyFinalized = rows.some((r) => r.finalized)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-midnight flex items-center gap-2">
            <Trophy size={22} /> Rewards & Achievements
          </h1>
          <p className="text-sm text-charcoal/60 mt-0.5">Monthly recognition programmes with admin-editable rating categories</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight/20">
            {categories.length === 0 && <option value="">No categories yet</option>}
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.memberCount})</option>)}
          </select>
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight/20" />
          <button onClick={() => setShowManage(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-gray-200 text-charcoal/60 hover:bg-gray-50 transition-colors">
            <Settings size={13} /> Manage Categories
          </button>
          {categoryId && (
            <button onClick={openMembers}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-gray-200 text-charcoal/60 hover:bg-gray-50 transition-colors">
              <Users size={13} /> Members
            </button>
          )}
          {categoryId && (
            <button onClick={finalizeMonth} disabled={finalizing || rows.length === 0}
              className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-50 ${anyFinalized ? 'bg-forest/10 text-forest' : 'bg-gold text-midnight hover:bg-gold/90'}`}>
              {anyFinalized ? <CheckCircle2 size={14} /> : <Lock size={14} />}
              {finalizing ? 'Finalizing…' : anyFinalized ? 'Re-finalize' : `Finalize`}
            </button>
          )}
        </div>
      </div>

      {toast && <div className="bg-forest/10 text-forest text-sm font-medium px-4 py-2.5 rounded-xl">{toast}</div>}

      {categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <p className="text-charcoal/40 text-sm mb-4">No recognition categories yet</p>
          <button onClick={() => setShowManage(true)} className="text-sm font-bold text-midnight bg-gold px-4 py-2 rounded-xl hover:bg-gold/90 transition-colors">
            <Plus size={14} className="inline mr-1" /> Create your first category
          </button>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-charcoal/40 text-sm">
          No members in this category yet — click "Members" to add educators
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const isOpen = expanded === row.userId
            const hasDraft = !!drafts[row.userId]
            return (
              <div key={row.userId} className={`bg-white rounded-2xl border overflow-hidden ${row.rank <= 3 ? 'border-gold/40' : 'border-gray-100'}`}>
                <button onClick={() => setExpanded(isOpen ? null : row.userId)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <RankBadge rank={row.rank} />
                    {row.avatarUrl ? (
                      <img src={row.avatarUrl} className="w-9 h-9 rounded-full object-cover" alt={row.name} />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-midnight/10 flex items-center justify-center text-xs font-bold text-midnight">
                        {row.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-midnight flex items-center gap-2">
                        {row.name}
                        {row.finalized && <span className="text-xs bg-forest/10 text-forest px-2 py-0.5 rounded-full font-bold">Finalized</span>}
                        {hasDraft && <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold">Unsaved</span>}
                      </p>
                      <p className="text-xs text-charcoal/40">{row.branch?.name ?? 'No campus'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-midnight">{row.average}<span className="text-xs text-charcoal/30">/10</span></p>
                      <p className="text-xs text-charcoal/40">average</p>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-charcoal/30" /> : <ChevronDown size={16} className="text-charcoal/30" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-50 px-5 py-4 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-3">
                      {row.scores.map((s) => (
                        <div key={s.criterionId} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${s.isAutoTest ? 'bg-midnight/5' : 'bg-gray-50'}`}>
                          <span className="text-xs font-medium text-charcoal/70 flex items-center gap-1">
                            {s.isAutoTest && <Sparkles size={11} className="text-gold" />}
                            {s.label}{s.isAutoTest ? ' (auto)' : ''}
                          </span>
                          {s.isAutoTest ? (
                            <span className="w-14 text-center text-sm font-bold text-midnight">{s.score}</span>
                          ) : (
                            <input type="number" min={0} max={10}
                              value={getDraftScore(row, s.criterionId, s.score)}
                              onChange={(e) => setDraftScore(row.userId, s.criterionId, Number(e.target.value))}
                              className="w-14 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-midnight focus:outline-none focus:ring-2 focus:ring-midnight/20" />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-charcoal/60">Admin Remark</label>
                      <textarea rows={2} value={drafts[row.userId]?.comment ?? row.comment ?? ''}
                        onChange={(e) => setDraftComment(row.userId, e.target.value)}
                        placeholder="Optional monthly remark for this educator..."
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-midnight/20" />
                    </div>

                    <button onClick={() => saveRow(row)} disabled={saving === row.userId}
                      className="flex items-center gap-1.5 text-xs font-bold bg-midnight text-white px-4 py-2 rounded-xl hover:bg-midnight/90 transition-colors disabled:opacity-50">
                      {saving === row.userId ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      {saving === row.userId ? 'Saving…' : 'Save Scores'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-midnight/5 rounded-2xl p-5 flex items-start gap-3">
        <Award size={18} className="text-gold flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-midnight">How this works</p>
          <p className="text-xs text-charcoal/50 mt-0.5">
            Each recognition category has its own educator group and its own editable list of rating criteria.
            "Student Test Understanding" auto-computes from that educator's branch's test scores this month.
            Finalizing locks the month, notifies every educator with their rank, and unlocks e-certificate downloads
            for the top 3 in their Recognition page.
          </p>
        </div>
      </div>

      {/* ── Manage Categories Modal ── */}
      {showManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-midnight">Manage Recognition Categories</h2>
              <button onClick={() => setShowManage(false)}><X size={20} className="text-charcoal/60" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Create new category */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-bold text-midnight">Create New Category</p>
                <div className="grid grid-cols-2 gap-3">
                  <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Category name e.g. Sports Educators"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-midnight/20" />
                  <input value={newCatGroupName} onChange={(e) => setNewCatGroupName(e.target.value)}
                    placeholder="New educator group name"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-midnight/20" />
                </div>
                <button onClick={createCategory} disabled={!newCatName.trim() || !newCatGroupName.trim()}
                  className="flex items-center gap-1.5 text-xs font-bold bg-midnight text-white px-4 py-2 rounded-xl hover:bg-midnight/90 transition-colors disabled:opacity-40">
                  <Plus size={13} /> Create Category
                </button>
              </div>

              {/* Existing categories */}
              <div className="space-y-3">
                {categories.map((cat) => (
                  <div key={cat.id} className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                      {editingCatId === cat.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input value={editCatName} onChange={(e) => setEditCatName(e.target.value)}
                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm" autoFocus />
                          <button onClick={() => saveCategoryName(cat.id)} className="text-forest hover:bg-forest/10 p-1.5 rounded-lg"><CheckCircle2 size={14} /></button>
                          <button onClick={() => setEditingCatId(null)} className="text-charcoal/40 hover:bg-gray-200 p-1.5 rounded-lg"><X size={14} /></button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-midnight">{cat.name} <span className="text-xs text-charcoal/40 font-normal">({cat.memberCount} members)</span></p>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditingCatId(cat.id); setEditCatName(cat.name) }} className="text-charcoal/30 hover:text-midnight p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={13} /></button>
                            <button onClick={() => deleteCategory(cat.id, cat.name)} className="text-charcoal/30 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={13} /></button>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      <p className="text-xs font-bold text-charcoal/40 uppercase tracking-wider">Rating Criteria</p>
                      {cat.criteria.map((crit) => (
                        <div key={crit.id} className="flex items-center justify-between text-sm bg-white border border-gray-100 rounded-lg px-3 py-1.5">
                          <span className="text-charcoal flex items-center gap-1.5">
                            {crit.isAutoTest && <Sparkles size={11} className="text-gold" />}
                            {crit.label}{crit.isAutoTest ? ' (auto)' : ''}
                          </span>
                          {!crit.isAutoTest && (
                            <button onClick={() => { setCategoryId(cat.id); deleteCriterion(crit.id, crit.label) }}
                              className="text-charcoal/30 hover:text-red-500"><Trash2 size={12} /></button>
                          )}
                        </div>
                      ))}
                      {categoryId === cat.id && (
                        <div className="flex items-center gap-2 mt-2">
                          <input value={newCriterionLabel} onChange={(e) => setNewCriterionLabel(e.target.value)}
                            placeholder="New rating criterion..."
                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                          <button onClick={addCriterion} disabled={!newCriterionLabel.trim()}
                            className="text-xs font-bold bg-midnight text-white px-3 py-1.5 rounded-lg disabled:opacity-40">Add</button>
                        </div>
                      )}
                      {categoryId !== cat.id && (
                        <button onClick={() => setCategoryId(cat.id)} className="text-xs text-midnight/60 hover:text-midnight font-medium mt-1">
                          Select this category to add criteria →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Members Modal ── */}
      {showMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-midnight">{currentCategory?.name} — Members</h2>
              <button onClick={() => setShowMembers(false)}><X size={20} className="text-charcoal/60" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Add member */}
              <div className="flex items-center gap-2">
                <select value={addCandidateId} onChange={(e) => setAddCandidateId(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select educator to add...</option>
                  {candidates.map((c) => <option key={c.userId} value={c.userId}>{c.name} — {c.branch ?? 'No campus'}</option>)}
                </select>
                <button onClick={addMember} disabled={!addCandidateId}
                  className="flex items-center gap-1 text-xs font-bold bg-forest text-white px-3 py-2 rounded-lg disabled:opacity-40">
                  <UserPlus size={13} /> Add
                </button>
              </div>

              {selectedToRemove.size > 0 && (
                <button onClick={removeSelectedMembers}
                  className="flex items-center gap-1.5 text-xs font-bold bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition-colors w-full justify-center">
                  <Trash2 size={13} /> Remove {selectedToRemove.size} selected
                </button>
              )}

              <div className="space-y-1">
                {members.map((m) => (
                  <div key={m.userId} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${selectedToRemove.has(m.userId) ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    <button onClick={() => toggleRemoveSelect(m.userId)} className="text-charcoal/30 hover:text-midnight">
                      {selectedToRemove.has(m.userId) ? <SquareCheck size={16} className="text-red-500" /> : <Square size={16} />}
                    </button>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-midnight">{m.name}</p>
                      <p className="text-xs text-charcoal/40">{m.branch ?? 'No campus'} · {m.email}</p>
                    </div>
                  </div>
                ))}
                {members.length === 0 && <p className="text-sm text-charcoal/30 text-center py-6">No members yet — add one above</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
