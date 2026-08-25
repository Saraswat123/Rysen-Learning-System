'use client'

import { useState, useEffect, useRef } from 'react'
import { Award, Download, Lock, ChevronLeft, CheckCircle2, GraduationCap } from 'lucide-react'
import Button from '@/components/ui/Button'

interface CertSummary {
  programId: string | null
  programName: string
  totalStages: number
  completedStages: number
  allPassed: boolean
}
interface CertData {
  programName: string
  name: string; branch: string | null; location: string | null
  completedAt: string | null
  stages: { number: number; title: string; badgeTitle: string | null; badgeColor: string }[]
}

export default function CertificatePage() {
  const [certs, setCerts] = useState<CertSummary[] | null>(null)
  const [selected, setSelected] = useState<CertSummary | null>(null)
  const [cert, setCert] = useState<CertData | null>(null)
  const [error, setError] = useState('')
  const certRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/educator/certificates').then((r) => r.json()).then((d) => {
      if (d.certificates) setCerts(d.certificates)
    })
  }, [])

  function openCert(c: CertSummary) {
    setSelected(c)
    setError('')
    setCert(null)
    const url = c.programId ? `/api/certificate?programId=${c.programId}` : '/api/certificate'
    fetch(url).then(async (r) => {
      if (!r.ok) { setError((await r.json()).error); return }
      return r.json()
    }).then((d) => d && setCert(d))
  }

  async function download() {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    doc.setFillColor(3, 61, 76) // midnight
    doc.rect(0, 0, 297, 210, 'F')

    doc.setFillColor(254, 203, 8) // gold
    doc.rect(10, 10, 277, 3, 'F')
    doc.rect(10, 197, 277, 3, 'F')

    doc.setTextColor(254, 203, 8)
    doc.setFontSize(32)
    doc.setFont('helvetica', 'bold')
    doc.text('RYSEN LEARNING CENTRE', 148, 45, { align: 'center' })

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text('This certifies that', 148, 65, { align: 'center' })

    doc.setFontSize(28)
    doc.setFont('helvetica', 'bold')
    doc.text(cert!.name, 148, 82, { align: 'center' })

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(255, 255, 255, 0.8 as unknown as number)
    doc.text(`${cert!.branch ?? ''} · ${cert!.location ?? ''}`, 148, 92, { align: 'center' })

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(13)
    doc.text('has successfully completed the', 148, 108, { align: 'center' })

    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(254, 203, 8)
    doc.text(cert!.programName, 148, 122, { align: 'center' })

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(255, 255, 255)
    doc.text(`completing all ${cert!.stages.length} stage${cert!.stages.length !== 1 ? 's' : ''}: ${cert!.stages.map((s) => s.badgeTitle ?? s.title).join(' · ')}`, 148, 135, { align: 'center', maxWidth: 260 })

    if (cert!.completedAt) {
      const date = new Date(cert!.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      doc.text(`Completed on ${date}`, 148, 155, { align: 'center' })
    }

    doc.setTextColor(254, 203, 8)
    doc.setFontSize(10)
    doc.text('RYSEN Group of Schools · Rise To Success · World-Class Learning, Personalized for Every Child', 148, 185, { align: 'center' })

    doc.save(`RYSEN_Certificate_${cert!.programName.replace(/\s/g, '_')}_${cert!.name.replace(/\s/g, '_')}.pdf`)
  }

  // ── Detail view (a specific certificate opened) ──
  if (selected) {
    if (error) return (
      <div className="max-w-xl mx-auto text-center py-16">
        <Lock size={48} className="text-charcoal/30 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-midnight mb-2">Certificate Not Available</h1>
        <p className="text-charcoal/60 text-sm">Complete all stages of "{selected.programName}" to unlock this certificate.</p>
        <Button onClick={() => setSelected(null)} variant="ghost" className="mt-6"><ChevronLeft size={15} /> Back to Certificates</Button>
      </div>
    )

    if (!cert) return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
      </div>
    )

    const completedDate = cert.completedAt
      ? new Date(cert.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : ''

    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-charcoal/50 hover:text-midnight transition-colors">
            <ChevronLeft size={16} /> All Certificates
          </button>
          <Button onClick={download}><Download size={16} /> Download PDF</Button>
        </div>

        {/* Certificate Preview */}
        <div ref={certRef} className="bg-midnight rounded-2xl overflow-hidden shadow-2xl">
          <div className="h-2 bg-gold" />
          <div className="p-10 text-center">
            <p className="text-gold text-sm font-bold tracking-widest uppercase mb-2">RYSEN Learning Centre</p>
            <p className="text-white/60 text-sm mb-4">This certifies that</p>
            <h2 className="text-4xl font-bold text-white mb-1">{cert.name}</h2>
            <p className="text-white/50 text-sm mb-6">{cert.branch} · {cert.location}</p>

            <p className="text-white/70 text-sm mb-2">has successfully completed the</p>
            <h3 className="text-xl font-bold text-gold mb-1">{cert.programName}</h3>
            <p className="text-white/50 text-xs mb-8">completing all {cert.stages.length} stage{cert.stages.length !== 1 ? 's' : ''} of the programme</p>

            <div className="flex justify-center gap-4 mb-8 flex-wrap">
              {cert.stages.map((s) => (
                <div key={s.number} className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
                    style={{ backgroundColor: s.badgeColor, color: s.badgeColor === '#FECB08' ? '#033D4C' : '#fff' }}>
                    {s.number}
                  </div>
                  <p className="text-white/60 text-xs text-center max-w-16">{s.badgeTitle ?? s.title}</p>
                </div>
              ))}
            </div>

            {completedDate && <p className="text-white/40 text-xs">Completed on {completedDate}</p>}
          </div>
          <div className="h-2 bg-gold" />
        </div>

        <p className="text-center text-xs text-charcoal/40 mt-4">RYSEN Group of Schools · Rise To Success</p>
      </div>
    )
  }

  // ── Overview: list all programs + certificate status ──
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-midnight flex items-center gap-2">
          <Award size={22} /> My Certificates
        </h1>
        <p className="text-sm text-charcoal/60 mt-0.5">Certificates unlock automatically once you pass every stage in a programme</p>
      </div>

      {!certs ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
        </div>
      ) : certs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-charcoal/30">
          <GraduationCap size={48} className="mb-4 opacity-20" />
          <p className="text-base font-medium">No programmes yet</p>
          <p className="text-sm mt-1">Enroll in a programme to start earning certificates</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {certs.map((c) => {
            const pct = c.totalStages > 0 ? Math.round((c.completedStages / c.totalStages) * 100) : 0
            return (
              <div key={c.programId ?? 'legacy'}
                className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-shadow ${c.allPassed ? 'border-gold/40 hover:shadow-md' : 'border-gray-100'}`}>
                <div className="flex items-stretch">
                  <div className="w-2 flex-shrink-0" style={{ backgroundColor: c.allPassed ? '#FECB08' : '#e5e7eb' }} />
                  <div className="flex-1 p-6 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${c.allPassed ? 'bg-midnight' : 'bg-gray-100'}`}>
                        {c.allPassed ? <Award size={20} className="text-gold" /> : <Lock size={18} className="text-charcoal/30" />}
                      </div>
                      <div>
                        <h2 className="font-bold text-midnight">{c.programName}</h2>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: c.allPassed ? '#225632' : '#FECB08' }} />
                          </div>
                          <span className="text-xs text-charcoal/50">{c.completedStages}/{c.totalStages} stages passed</span>
                          {c.allPassed && (
                            <span className="text-xs text-forest font-semibold flex items-center gap-1 bg-forest/10 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={11} /> Complete
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button onClick={() => openCert(c)} disabled={!c.allPassed}
                      className={c.allPassed ? '' : 'bg-gray-100 text-charcoal/30 hover:bg-gray-100 cursor-not-allowed'}>
                      {c.allPassed ? <><Award size={15} /> View Certificate</> : 'Locked'}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
