'use client'

import { Star, Sparkles } from 'lucide-react'

export default function StarStudentsPage() {
  return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-5">
        <Star size={28} className="text-gold" />
      </div>
      <h1 className="text-2xl font-bold text-midnight mb-2">Star Students</h1>
      <p className="text-sm text-charcoal/60 max-w-md mx-auto">
        A monthly spotlight on your top-performing students is coming here — ranked by test scores and
        completion. This tab is reserved; tell your admin what should count toward it and it'll light up.
      </p>
      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full mt-5">
        <Sparkles size={12} /> Coming soon
      </div>
    </div>
  )
}
