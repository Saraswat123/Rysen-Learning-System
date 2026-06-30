'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ClipboardList, Clock, CheckCircle, XCircle, ChevronRight, Award } from 'lucide-react'

interface Attempt {
  id: string; score: number; totalMarks: number; passed: boolean; completedAt: string
}
interface Test {
  id: string; title: string; description: string | null; subject: string
  targetClass: string; timeLimitMinutes: number; passScore: number
  _count: { questions: number }; attempt: Attempt | null
}
interface Student { name: string; class: string; section: string; branch?: { name: string } | null }

const COLORS = ['#033D4C', '#225632', '#7D783E', '#40403E', '#5B4D8A']

export default function StudentDashboard() {
  const [tests, setTests] = useState<Test[]>([])
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/student-tests?student=true').then((r) => r.json()),
      fetch('/api/auth/student-me').then((r) => r.json()),
    ]).then(([t, m]) => {
      setTests(Array.isArray(t) ? t : [])
      setStudent(m.student)
      setLoading(false)
    })
  }, [])

  const passed = tests.filter((t) => t.attempt?.passed).length
  const attempted = tests.filter((t) => t.attempt).length

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-midnight border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const initials = student?.name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?'

  return (
    <div>
      {/* Profile Card */}
      <div className="bg-midnight text-white rounded-2xl p-5 mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gold flex items-center justify-center text-midnight text-lg font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg leading-tight">{student?.name}</h2>
          <p className="text-white/60 text-sm">Class {student?.class}{student?.section ? ` - ${student.section}` : ''}</p>
          {student?.branch?.name && <p className="text-white/40 text-xs mt-0.5">{student.branch.name}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="flex gap-4">
            <div>
              <p className="text-2xl font-bold text-gold">{passed}</p>
              <p className="text-xs text-white/50">passed</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{attempted}</p>
              <p className="text-xs text-white/50">taken</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{tests.length}</p>
              <p className="text-xs text-white/50">total</p>
            </div>
          </div>
        </div>
      </div>

      <h1 className="text-xl font-bold text-midnight mb-4">Available Tests</h1>

      {tests.length === 0 ? (
        <div className="text-center py-16 text-charcoal/40">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No tests available yet. Check back soon!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tests.map((test, i) => {
            const color = COLORS[i % COLORS.length]
            const { attempt } = test
            const pct = attempt ? Math.round((attempt.score / (attempt.totalMarks || 1)) * 100) : null
            return (
              <div key={test.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="flex items-stretch">
                  <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: color }} />
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-bold text-midnight">{test.title}</h3>
                          {test.subject && <span className="text-xs bg-olive/10 text-olive px-2 py-0.5 rounded-full">{test.subject}</span>}
                          {attempt?.passed && (
                            <span className="flex items-center gap-1 text-xs bg-forest/10 text-forest px-2 py-0.5 rounded-full font-medium">
                              <Award size={11} /> Passed
                            </span>
                          )}
                          {attempt && !attempt.passed && (
                            <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">Not Passed</span>
                          )}
                        </div>
                        {test.description && <p className="text-sm text-charcoal/60 mb-2">{test.description}</p>}
                        <div className="flex items-center gap-4 text-xs text-charcoal/50">
                          <span className="flex items-center gap-1"><ClipboardList size={11} /> {test._count.questions} Q</span>
                          <span className="flex items-center gap-1"><Clock size={11} /> {test.timeLimitMinutes} min</span>
                          <span>Pass: {test.passScore}%</span>
                          {pct !== null && (
                            <span className={`font-semibold ${attempt?.passed ? 'text-forest' : 'text-red-500'}`}>
                              Score: {pct}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {attempt ? (
                          <div className="flex items-center gap-2">
                            {attempt.passed
                              ? <CheckCircle size={20} className="text-forest" />
                              : <XCircle size={20} className="text-red-400" />}
                            <Link href={`/student/test/${test.id}`}>
                              <button className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border border-midnight/20 text-midnight hover:bg-midnight/5 transition-colors">
                                Retry <ChevronRight size={13} />
                              </button>
                            </Link>
                          </div>
                        ) : (
                          <Link href={`/student/test/${test.id}`}>
                            <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl text-white transition-colors"
                              style={{ backgroundColor: color }}>
                              Start <ChevronRight size={15} />
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>
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
