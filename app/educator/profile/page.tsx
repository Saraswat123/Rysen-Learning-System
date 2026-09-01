'use client'

import { useState, useEffect, useRef } from 'react'
import { User, Mail, Phone, MapPin, Building2, CheckCircle2, BookOpen, ClipboardList, Star, Pencil, Save, X, Loader2, Camera } from 'lucide-react'

interface Profile {
  id: string
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  role: string
  branch: { id: string; name: string; location: string } | null
  createdAt: string
  stats: {
    stagesPassed: number
    totalStages: number
    avgScore: number
    tasksTotal: number
    tasksCompleted: number
  }
}

function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const colors = [
    'bg-midnight text-gold',
    'bg-forest text-gold',
    'bg-olive text-cream',
    'bg-charcoal text-gold',
  ]
  const color = colors[name.charCodeAt(0) % colors.length]

  return (
    <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold shadow-lg ${color}`}>
      {initials}
    </div>
  )
}

export default function EducatorProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/auth/profile')
      .then((r) => r.json())
      .then((d) => {
        setProfile(d)
        setPhone(d.phone ?? '')
        setLoading(false)
      })
  }, [])

  async function savePhone() {
    if (!profile) return
    setSaving(true)
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    if (res.ok) {
      const updated = await res.json()
      setProfile((p) => p ? { ...p, phone: updated.phone } : p)
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError('')
    setUploadingPhoto(true)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/auth/avatar', { method: 'POST', body: formData })
    const data = await res.json()
    setUploadingPhoto(false)
    if (!res.ok) { setPhotoError(data.error ?? 'Upload failed'); return }
    setProfile((p) => p ? { ...p, avatarUrl: data.url } : p)
    if (fileRef.current) fileRef.current.value = ''
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) return <p className="text-center text-charcoal/50 py-16">Unable to load profile.</p>

  const { stats } = profile
  const trainingPct = stats.totalStages ? Math.round((stats.stagesPassed / stats.totalStages) * 100) : 0
  const taskPct = stats.tasksTotal ? Math.round((stats.tasksCompleted / stats.tasksTotal) * 100) : 0

  const joinDate = new Date(profile.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header card */}
      <div className="bg-midnight rounded-2xl p-8 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative group">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.name} className="w-24 h-24 rounded-full object-cover shadow-lg" />
          ) : (
            <InitialsAvatar name={profile.name} />
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingPhoto}
            title="Change photo"
            className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity disabled:opacity-100"
          >
            {uploadingPhoto ? <Loader2 size={18} className="text-white animate-spin" /> : <Camera size={18} className="text-white" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
        </div>
        <div className="text-center sm:text-left">
          <h1 className="text-white text-2xl font-bold">{profile.name}</h1>
          <p className="text-gold text-sm font-medium mt-1">{profile.role.replace('_', ' ')}</p>
          {profile.branch && (
            <p className="text-white/50 text-sm mt-1 flex items-center justify-center sm:justify-start gap-1.5">
              <Building2 size={13} /> {profile.branch.name}
              {profile.branch.location && ` · ${profile.branch.location}`}
            </p>
          )}
          <p className="text-white/30 text-xs mt-2">Member since {joinDate}</p>
          {photoError && <p className="text-red-300 text-xs mt-1">{photoError}</p>}
        </div>
        {saved && (
          <div className="sm:ml-auto flex items-center gap-2 bg-forest/80 text-white text-sm px-4 py-2 rounded-full">
            <CheckCircle2 size={14} /> Saved
          </div>
        )}
      </div>

      {/* Contact info */}
      <div className="bg-white rounded-2xl p-6 space-y-4 shadow-sm">
        <h2 className="font-semibold text-midnight text-lg">Contact Info</h2>

        <div className="flex items-center gap-3 text-charcoal">
          <Mail size={16} className="text-midnight/40 shrink-0" />
          <span className="text-sm">{profile.email}</span>
        </div>

        {profile.branch && (
          <div className="flex items-center gap-3 text-charcoal">
            <MapPin size={16} className="text-midnight/40 shrink-0" />
            <span className="text-sm">{profile.branch.location || profile.branch.name}</span>
          </div>
        )}

        {/* Phone — editable */}
        <div className="flex items-center gap-3">
          <Phone size={16} className="text-midnight/40 shrink-0" />
          {editing ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-midnight/30"
                autoFocus
              />
              <button
                onClick={savePhone}
                disabled={saving}
                className="bg-midnight text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 hover:bg-midnight/90 transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setEditing(false); setPhone(profile.phone ?? '') }}
                className="text-charcoal/40 hover:text-charcoal p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm text-charcoal">{profile.phone || <span className="text-charcoal/30 italic">No phone added</span>}</span>
              <button
                onClick={() => setEditing(true)}
                className="ml-auto text-midnight/40 hover:text-midnight p-1.5 rounded-lg hover:bg-midnight/5 transition-colors"
                title="Edit phone"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, label: 'Stages Passed', value: stats.stagesPassed, sub: `of ${stats.totalStages}`, color: 'bg-midnight text-white' },
          { icon: Star, label: 'Avg Score', value: `${stats.avgScore}%`, sub: 'across stages', color: 'bg-gold text-midnight' },
          { icon: ClipboardList, label: 'Tasks Done', value: stats.tasksCompleted, sub: `of ${stats.tasksTotal}`, color: 'bg-forest text-white' },
          { icon: User, label: 'Profile', value: profile.phone ? '100%' : '80%', sub: profile.phone ? 'Complete' : 'Add phone', color: 'bg-olive text-white' },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className={`${color} rounded-2xl p-4 flex flex-col gap-1 shadow-sm`}>
            <Icon size={18} className="opacity-70" />
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs font-medium opacity-80">{label}</p>
            <p className="text-xs opacity-50">{sub}</p>
          </div>
        ))}
      </div>

      {/* Progress bars */}
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="font-semibold text-midnight text-lg">Progress</h2>

        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-charcoal">Training Stages</span>
            <span className="font-semibold text-midnight">{stats.stagesPassed}/{stats.totalStages} passed</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-midnight rounded-full transition-all duration-700"
              style={{ width: `${trainingPct}%` }}
            />
          </div>
          <p className="text-xs text-charcoal/40 mt-1">{trainingPct}% complete</p>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-charcoal">Task Completion</span>
            <span className="font-semibold text-forest">{stats.tasksCompleted}/{stats.tasksTotal} tasks</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-forest rounded-full transition-all duration-700"
              style={{ width: `${taskPct}%` }}
            />
          </div>
          <p className="text-xs text-charcoal/40 mt-1">{taskPct}% complete</p>
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/educator/dashboard', label: 'My Journey', bg: 'bg-midnight' },
          { href: '/educator/tasks', label: 'My Tasks', bg: 'bg-olive' },
          { href: '/educator/certificate', label: 'Certificate', bg: 'bg-forest' },
          { href: '/educator/recognition', label: 'Recognition', bg: 'bg-gold', text: 'text-midnight' },
        ].map(({ href, label, bg, text }) => (
          <a
            key={href}
            href={href}
            className={`${bg} ${text ?? 'text-white'} rounded-xl px-4 py-3 text-sm font-semibold text-center hover:opacity-90 transition-opacity`}
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  )
}
