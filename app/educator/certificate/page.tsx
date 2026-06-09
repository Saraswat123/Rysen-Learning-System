'use client'

import { useState, useEffect, useRef } from 'react'
import { Award, Download, Lock } from 'lucide-react'
import Button from '@/components/ui/Button'

interface CertData {
  name: string; branch: string | null; location: string | null
  completedAt: string | null
  stages: { number: number; title: string; badgeTitle: string | null; badgeColor: string }[]
}

export default function CertificatePage() {
  const [cert, setCert] = useState<CertData | null>(null)
  const [error, setError] = useState('')
  const certRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/certificate').then(async (r) => {
      if (!r.ok) { setError((await r.json()).error); return }
      return r.json()
    }).then((d) => d && setCert(d))
  }, [])

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
    doc.text('RYSEN Professional Development & Onboarding Programme', 148, 122, { align: 'center' })

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(255, 255, 255)
    doc.text('completing all 5 stages: Welcome Week · RYSEN Way · Skills Building · Observe & Coach · Embed & Grow', 148, 135, { align: 'center' })

    if (cert!.completedAt) {
      const date = new Date(cert!.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      doc.text(`Completed on ${date}`, 148, 150, { align: 'center' })
    }

    doc.setTextColor(254, 203, 8)
    doc.setFontSize(10)
    doc.text('RYSEN Group of Schools · Rise To Success · World-Class Learning, Personalized for Every Child', 148, 185, { align: 'center' })

    doc.save(`RYSEN_Certificate_${cert!.name.replace(/\s/g, '_')}.pdf`)
  }

  if (error) return (
    <div className="max-w-xl mx-auto text-center py-16">
      <Lock size={48} className="text-charcoal/30 mx-auto mb-4" />
      <h1 className="text-xl font-bold text-midnight mb-2">Certificate Not Available</h1>
      <p className="text-charcoal/60 text-sm">Complete all 5 stages to unlock your certificate.</p>
      <Button onClick={() => history.back()} variant="ghost" className="mt-6">← Back to Journey</Button>
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
        <h1 className="text-2xl font-bold text-midnight">Your Certificate</h1>
        <Button onClick={download}><Download size={16} /> Download PDF</Button>
      </div>

      {/* Certificate Preview */}
      <div ref={certRef} className="bg-midnight rounded-2xl overflow-hidden shadow-2xl">
        {/* Gold top bar */}
        <div className="h-2 bg-gold" />

        <div className="p-10 text-center">
          <p className="text-gold text-sm font-bold tracking-widest uppercase mb-2">RYSEN Learning Centre</p>
          <p className="text-white/60 text-sm mb-4">This certifies that</p>
          <h2 className="text-4xl font-bold text-white mb-1">{cert.name}</h2>
          <p className="text-white/50 text-sm mb-6">{cert.branch} · {cert.location}</p>

          <p className="text-white/70 text-sm mb-2">has successfully completed the</p>
          <h3 className="text-xl font-bold text-gold mb-1">RYSEN Professional Development & Onboarding Programme</h3>
          <p className="text-white/50 text-xs mb-8">completing all 5 stages of the RYSEN Learning Centre framework</p>

          {/* Badges */}
          <div className="flex justify-center gap-4 mb-8 flex-wrap">
            {cert.stages.map((s) => (
              <div key={s.number} className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
                  style={{ backgroundColor: s.badgeColor, color: s.badgeColor === '#FECB08' ? '#033D4C' : '#fff' }}>
                  {s.number}
                </div>
                <p className="text-white/60 text-xs text-center max-w-16">{s.badgeTitle}</p>
              </div>
            ))}
          </div>

          {completedDate && (
            <p className="text-white/40 text-xs">Completed on {completedDate}</p>
          )}
        </div>

        {/* Gold bottom bar */}
        <div className="h-2 bg-gold" />
      </div>

      <p className="text-center text-xs text-charcoal/40 mt-4">
        RYSEN Group of Schools · Rise To Success
      </p>
    </div>
  )
}
