'use client'

import { use } from 'react'
import StudentProgramEditor from '@/components/StudentProgramEditor'

export default function EducatorStudentProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <StudentProgramEditor programId={id} basePath="/educator/student-programs" />
}
