import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStudentSession } from '@/lib/student-auth'
import { educatorBranchListWhere } from '@/lib/branch-scope'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const student = await getStudentSession()
    if (!student) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const program = await db.studentProgram.findFirst({
      where: {
        id,
        isPublished: true,
        AND: [
          educatorBranchListWhere(student.branchId),
          { OR: [{ targetClass: '' }, { targetClass: student.class }] },
        ],
      },
      select: { id: true },
    })
    if (!program) return NextResponse.json({ error: 'Program is not available for your campus or class' }, { status: 404 })

    const enrollment = await db.studentProgramEnrollment.upsert({
      where: { studentId_programId: { studentId: student.id, programId: program.id } },
      create: { studentId: student.id, programId: program.id },
      update: {},
      select: { id: true, enrolledAt: true },
    })
    return NextResponse.json({ enrolled: true, enrollment }, { status: 200 })
  } catch (err) {
    console.error('[student-programs/enroll]', err)
    return NextResponse.json({ error: 'Could not enroll in this program. Please try again.' }, { status: 500 })
  }
}
