'use client'

import { useState } from 'react'
import { Trash2, RefreshCw, Database, Bell, HardDrive, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import Button from '@/components/ui/Button'
import Toast from '@/components/Toast'

interface CleanupResult {
  notificationsReadDeleted: number
  notificationsUnreadDeleted: number
  orphanedBlobsDeleted: number
  blobCleanupError?: string
  ranAt: string
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ size: number; className?: string }>; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-charcoal/50 font-medium">{label}</p>
        <p className="text-xl font-bold text-midnight">{value}</p>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [running, setRunning] = useState(false)
  const [lastResult, setLastResult] = useState<CleanupResult | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  async function runCleanup() {
    setRunning(true)
    try {
      const res = await fetch('/api/admin/cleanup', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setLastResult(data.results)
        const total = data.results.notificationsReadDeleted + data.results.notificationsUnreadDeleted + data.results.orphanedBlobsDeleted
        setToast({ msg: `Cleanup done — ${total} item${total !== 1 ? 's' : ''} removed`, type: 'success' })
      } else {
        setToast({ msg: data.error ?? 'Cleanup failed', type: 'error' })
      }
    } catch {
      setToast({ msg: 'Network error', type: 'error' })
    }
    setRunning(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h1 className="text-2xl font-bold text-midnight">Settings</h1>
        <p className="text-sm text-charcoal/60 mt-0.5">System maintenance and data management</p>
      </div>

      {/* Data Cleanup Card */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-midnight flex items-center gap-2">
                <Trash2 size={16} className="text-red-400" /> Data Cleanup
              </h2>
              <p className="text-sm text-charcoal/50 mt-1">
                Removes old notifications and orphaned uploaded files to keep the database lean.
              </p>
            </div>
            <Button onClick={runCleanup} loading={running} size="sm"
              className="flex-shrink-0 flex items-center gap-1.5">
              <RefreshCw size={13} className={running ? 'animate-spin' : ''} />
              Run Now
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Rules */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Cleanup Rules</p>
            <div className="grid gap-2">
              {[
                { icon: Bell, label: 'Read notifications', rule: 'Deleted after 30 days', color: 'bg-blue-400' },
                { icon: Bell, label: 'Unread notifications', rule: 'Deleted after 90 days', color: 'bg-orange-400' },
                { icon: HardDrive, label: 'Orphaned file uploads', rule: 'Deleted if no Resource record points to them', color: 'bg-purple-400' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${item.color}`}>
                    <item.icon size={13} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-midnight">{item.label}</p>
                    <p className="text-xs text-charcoal/50">{item.rule}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Last run result */}
          {lastResult && (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Last Run Results</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard icon={Bell} label="Read notifs deleted" value={lastResult.notificationsReadDeleted} color="bg-blue-400" />
                <StatCard icon={Bell} label="Unread notifs deleted" value={lastResult.notificationsUnreadDeleted} color="bg-orange-400" />
                <StatCard icon={HardDrive} label="Orphaned files deleted" value={lastResult.orphanedBlobsDeleted} color="bg-purple-400" />
              </div>
              {lastResult.blobCleanupError && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-xl text-orange-700 text-xs">
                  <AlertCircle size={14} /> {lastResult.blobCleanupError}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-charcoal/40">
                <Clock size={12} /> Ran at {new Date(lastResult.ranAt).toLocaleString('en-IN')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Auto-cleanup info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-bold text-midnight flex items-center gap-2 mb-4">
          <Database size={16} className="text-forest" /> Auto-Cleanup Schedule
        </h2>
        <div className="flex items-start gap-3 p-4 bg-forest/5 rounded-xl">
          <CheckCircle size={16} className="text-forest mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-midnight">Runs automatically every night at 2:00 AM</p>
            <p className="text-xs text-charcoal/50 mt-0.5">
              Powered by Vercel Cron — no manual action needed. Use "Run Now" above to trigger immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
