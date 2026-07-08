export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'
import { Pool } from 'pg'

const MIGRATIONS = [
  {
    label: 'Question.docGroupId',
    check: `SELECT 1 FROM information_schema.columns WHERE table_name='Question' AND column_name='docGroupId'`,
    sql: `ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "docGroupId" TEXT`,
  },
  {
    label: 'Stage.weeks',
    check: `SELECT 1 FROM information_schema.columns WHERE table_name='Stage' AND column_name='weeks'`,
    sql: `ALTER TABLE "Stage" ADD COLUMN IF NOT EXISTS "weeks" JSONB NOT NULL DEFAULT '[]'`,
  },
  {
    label: 'Program table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='Program'`,
    sql: `CREATE TABLE IF NOT EXISTS "Program" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "isPublished" BOOLEAN NOT NULL DEFAULT false,
      "applicableTo" TEXT NOT NULL DEFAULT 'BOTH',
      "order" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    label: 'Stage.programId',
    check: `SELECT 1 FROM information_schema.columns WHERE table_name='Stage' AND column_name='programId'`,
    sql: `ALTER TABLE "Stage" ADD COLUMN IF NOT EXISTS "programId" TEXT REFERENCES "Program"("id") ON DELETE SET NULL`,
  },
  {
    label: 'Stage.number unique constraint drop',
    check: `SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='Stage_number_key' AND table_name='Stage'`,
    sql: `ALTER TABLE "Stage" DROP CONSTRAINT IF EXISTS "Stage_number_key"`,
    // This one: if constraint EXISTS we run the drop. Invert check logic below.
    invert: true,
  },
  {
    label: 'Default Orientation Program seed',
    check: `SELECT 1 FROM "Program" WHERE "id" = 'default-orientation'`,
    sql: `INSERT INTO "Program" ("id","name","description","isPublished","applicableTo","order","createdAt")
          VALUES ('default-orientation','Orientation Program','The core 5-stage teacher orientation',true,'BOTH',0,NOW())`,
  },
  {
    label: 'Assign existing stages to Orientation Program',
    check: `SELECT 1 FROM "Stage" WHERE "programId" IS NULL LIMIT 1`,
    sql: `UPDATE "Stage" SET "programId" = 'default-orientation' WHERE "programId" IS NULL`,
  },
  {
    label: 'ProgramEnrollment table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='ProgramEnrollment'`,
    sql: `CREATE TABLE IF NOT EXISTS "ProgramEnrollment" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "programId" TEXT NOT NULL REFERENCES "Program"("id") ON DELETE CASCADE,
      "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("userId","programId")
    )`,
  },
  {
    label: 'Auto-enroll existing educators in Orientation Program',
    check: `SELECT 1 FROM "ProgramEnrollment" WHERE "programId" = 'default-orientation' LIMIT 1`,
    sql: `INSERT INTO "ProgramEnrollment" ("id","userId","programId","enrolledAt")
          SELECT gen_random_uuid()::text, u."id", 'default-orientation', NOW()
          FROM "User" u
          WHERE u."role" IN ('EDUCATOR','PRINCIPAL')
          AND NOT EXISTS (
            SELECT 1 FROM "ProgramEnrollment" e WHERE e."userId"=u."id" AND e."programId"='default-orientation'
          )`,
  },
  {
    label: 'Student table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='Student'`,
    sql: `CREATE TABLE IF NOT EXISTS "Student" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "class" TEXT NOT NULL,
      "section" TEXT NOT NULL DEFAULT '',
      "subject" TEXT NOT NULL DEFAULT '',
      "branchId" TEXT REFERENCES "Branch"("id") ON DELETE SET NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    label: 'StudentSession table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='StudentSession'`,
    sql: `CREATE TABLE IF NOT EXISTS "StudentSession" (
      "id" TEXT PRIMARY KEY,
      "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
      "token" TEXT NOT NULL UNIQUE,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    label: 'StudentTest table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='StudentTest'`,
    sql: `CREATE TABLE IF NOT EXISTS "StudentTest" (
      "id" TEXT PRIMARY KEY,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "subject" TEXT NOT NULL DEFAULT '',
      "targetClass" TEXT NOT NULL DEFAULT '',
      "timeLimitMinutes" INTEGER NOT NULL DEFAULT 30,
      "passScore" INTEGER NOT NULL DEFAULT 60,
      "isPublished" BOOLEAN NOT NULL DEFAULT false,
      "order" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    label: 'StudentQuestion table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='StudentQuestion'`,
    sql: `CREATE TABLE IF NOT EXISTS "StudentQuestion" (
      "id" TEXT PRIMARY KEY,
      "testId" TEXT NOT NULL REFERENCES "StudentTest"("id") ON DELETE CASCADE,
      "type" TEXT NOT NULL DEFAULT 'MCQ',
      "text" TEXT NOT NULL,
      "imageUrl" TEXT,
      "videoUrl" TEXT,
      "options" JSONB NOT NULL DEFAULT '[]',
      "correctId" TEXT NOT NULL DEFAULT '',
      "explanation" TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      "marks" INTEGER NOT NULL DEFAULT 1
    )`,
  },
  {
    label: 'StudentTest.createdBy column',
    check: `SELECT 1 FROM information_schema.columns WHERE table_name='StudentTest' AND column_name='createdBy'`,
    sql: `ALTER TABLE "StudentTest" ADD COLUMN IF NOT EXISTS "createdBy" TEXT NOT NULL DEFAULT 'ADMIN'`,
  },
  {
    label: 'StudentTest.branchId column',
    check: `SELECT 1 FROM information_schema.columns WHERE table_name='StudentTest' AND column_name='branchId'`,
    sql: `ALTER TABLE "StudentTest" ADD COLUMN IF NOT EXISTS "branchId" TEXT REFERENCES "Branch"("id") ON DELETE SET NULL`,
  },
  {
    label: 'StudentAttempt table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='StudentAttempt'`,
    sql: `CREATE TABLE IF NOT EXISTS "StudentAttempt" (
      "id" TEXT PRIMARY KEY,
      "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
      "testId" TEXT NOT NULL REFERENCES "StudentTest"("id") ON DELETE CASCADE,
      "score" INTEGER NOT NULL DEFAULT 0,
      "totalMarks" INTEGER NOT NULL DEFAULT 0,
      "passed" BOOLEAN NOT NULL DEFAULT false,
      "answers" JSONB NOT NULL DEFAULT '{}',
      "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    label: 'TaskGroup table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='TaskGroup'`,
    sql: `CREATE TABLE IF NOT EXISTS "TaskGroup" (
      "id" TEXT PRIMARY KEY,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "color" TEXT NOT NULL DEFAULT '#033D4C',
      "createdById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    label: 'Task table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='Task'`,
    sql: `CREATE TABLE IF NOT EXISTS "Task" (
      "id" TEXT PRIMARY KEY,
      "groupId" TEXT REFERENCES "TaskGroup"("id") ON DELETE SET NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "deadline" TIMESTAMP(3),
      "priority" TEXT NOT NULL DEFAULT 'NORMAL',
      "createdById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    label: 'SubTask table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='SubTask'`,
    sql: `CREATE TABLE IF NOT EXISTS "SubTask" (
      "id" TEXT PRIMARY KEY,
      "taskId" TEXT NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
      "title" TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    label: 'TaskResource table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='TaskResource'`,
    sql: `CREATE TABLE IF NOT EXISTS "TaskResource" (
      "id" TEXT PRIMARY KEY,
      "taskId" TEXT NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
      "type" TEXT NOT NULL DEFAULT 'URL',
      "title" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    label: 'TaskAssignment table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='TaskAssignment'`,
    sql: `CREATE TABLE IF NOT EXISTS "TaskAssignment" (
      "id" TEXT PRIMARY KEY,
      "taskId" TEXT NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "completedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("taskId","userId")
    )`,
  },
  {
    label: 'SubTaskProgress table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='SubTaskProgress'`,
    sql: `CREATE TABLE IF NOT EXISTS "SubTaskProgress" (
      "id" TEXT PRIMARY KEY,
      "assignmentId" TEXT NOT NULL REFERENCES "TaskAssignment"("id") ON DELETE CASCADE,
      "subtaskId" TEXT NOT NULL REFERENCES "SubTask"("id") ON DELETE CASCADE,
      "completed" BOOLEAN NOT NULL DEFAULT false,
      "completedAt" TIMESTAMP(3),
      UNIQUE("assignmentId","subtaskId")
    )`,
  },
  {
    label: 'TaskComment table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='TaskComment'`,
    sql: `CREATE TABLE IF NOT EXISTS "TaskComment" (
      "id" TEXT PRIMARY KEY,
      "taskId" TEXT NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "text" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    label: 'Notification table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='Notification'`,
    sql: `CREATE TABLE IF NOT EXISTS "Notification" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "title" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'TASK',
      "read" BOOLEAN NOT NULL DEFAULT false,
      "relatedId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    label: 'Task.notes column',
    check: `SELECT 1 FROM information_schema.columns WHERE table_name='Task' AND column_name='notes'`,
    sql: `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "notes" TEXT`,
  },
  {
    label: 'SubTask.deadline column',
    check: `SELECT 1 FROM information_schema.columns WHERE table_name='SubTask' AND column_name='deadline'`,
    sql: `ALTER TABLE "SubTask" ADD COLUMN IF NOT EXISTS "deadline" TIMESTAMP(3)`,
  },
  {
    label: 'TaskResource.description column',
    check: `SELECT 1 FROM information_schema.columns WHERE table_name='TaskResource' AND column_name='description'`,
    sql: `ALTER TABLE "TaskResource" ADD COLUMN IF NOT EXISTS "description" TEXT`,
  },
]

async function checkPending() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 8000 })
  try {
    for (const m of MIGRATIONS) {
      const { rows } = await pool.query(m.check)
      const needed = m.invert ? rows.length > 0 : rows.length === 0
      if (needed) return true
    }
    return false
  } finally {
    await pool.end()
  }
}

export async function GET() {
  const user = await getSession()
  if (!user || user.role !== Role.SUPER_ADMIN) return NextResponse.json({ pending: false })
  const pending = await checkPending()
  return NextResponse.json({ pending })
}

export async function POST() {
  const user = await getSession()
  if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 8000 })
  const results: string[] = []

  try {
    for (const m of MIGRATIONS) {
      const { rows } = await pool.query(m.check)
      const needed = m.invert ? rows.length > 0 : rows.length === 0
      if (needed) {
        await pool.query(m.sql)
        results.push(`✓ ${m.label}`)
      } else {
        results.push(`— ${m.label} (already done)`)
      }
    }
    return NextResponse.json({ ok: true, results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  } finally {
    await pool.end()
  }
}
