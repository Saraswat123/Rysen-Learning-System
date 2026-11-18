'use client'

import { use } from 'react'
import StudentProgramEditor from '@/components/StudentProgramEditor'

export default function AdminStudentProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <StudentProgramEditor programId={id} basePath="/admin/student-programs" />
}
