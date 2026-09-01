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
  {
    label: 'User.phone column',
    check: `SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='phone'`,
    sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT`,
  },
  {
    label: 'EducatorGroup table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='EducatorGroup'`,
    sql: `CREATE TABLE IF NOT EXISTS "EducatorGroup" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "color" TEXT NOT NULL DEFAULT '#033D4C',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    label: 'EducatorGroupMember table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='EducatorGroupMember'`,
    sql: `CREATE TABLE IF NOT EXISTS "EducatorGroupMember" (
      "id" TEXT PRIMARY KEY,
      "groupId" TEXT NOT NULL REFERENCES "EducatorGroup"("id") ON DELETE CASCADE,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("groupId","userId")
    )`,
  },
  {
    label: 'Resource table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='Resource'`,
    sql: `CREATE TABLE IF NOT EXISTS "Resource" (
      "id" TEXT PRIMARY KEY,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "url" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'LINK',
      "category" TEXT NOT NULL DEFAULT 'General',
      "isPublished" BOOLEAN NOT NULL DEFAULT true,
      "isPinned" BOOLEAN NOT NULL DEFAULT false,
      "branchId" TEXT REFERENCES "Branch"("id") ON DELETE SET NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    label: 'Task.visibility',
    check: `SELECT 1 FROM information_schema.columns WHERE table_name='Task' AND column_name='visibility'`,
    sql: `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'ALL_ADMINS'`,
  },
  {
    label: 'Resource.url nullable',
    check: `SELECT 1 FROM information_schema.columns WHERE table_name='Resource' AND column_name='url' AND is_nullable='YES'`,
    sql: `ALTER TABLE "Resource" ALTER COLUMN "url" DROP NOT NULL`,
  },
  {
    label: 'Resource.groupId column',
    check: `SELECT 1 FROM information_schema.columns WHERE table_name='Resource' AND column_name='groupId'`,
    sql: `ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "groupId" TEXT REFERENCES "EducatorGroup"("id") ON DELETE SET NULL`,
  },
  {
    label: 'GroupMessage table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='GroupMessage'`,
    sql: `CREATE TABLE IF NOT EXISTS "GroupMessage" (
      "id" TEXT PRIMARY KEY,
      "groupId" TEXT NOT NULL REFERENCES "EducatorGroup"("id") ON DELETE CASCADE,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "text" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    label: 'User.password column',
    check: `SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='password'`,
    sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT`,
  },
  {
    label: 'User.passwordSetAt column',
    check: `SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='passwordSetAt'`,
    sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordSetAt" TIMESTAMP(3)`,
  },
  {
    label: 'User.avatarUrl column',
    check: `SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='avatarUrl'`,
    sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT`,
  },
  {
    label: 'Drop legacy fixed-KRA EducatorRating table',
    check: `SELECT 1 FROM information_schema.columns WHERE table_name='EducatorRating' AND column_name='kra1'`,
    sql: `DROP TABLE IF EXISTS "EducatorRating"`,
  },
  {
    label: 'RecognitionCategory table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='RecognitionCategory'`,
    sql: `CREATE TABLE IF NOT EXISTS "RecognitionCategory" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "groupId" TEXT NOT NULL UNIQUE REFERENCES "EducatorGroup"("id") ON DELETE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    label: 'RatingCriterion table',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='RatingCriterion'`,
    sql: `CREATE TABLE IF NOT EXISTS "RatingCriterion" (
      "id" TEXT PRIMARY KEY,
      "categoryId" TEXT NOT NULL REFERENCES "RecognitionCategory"("id") ON DELETE CASCADE,
      "label" TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      "isAutoTest" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    label: 'EducatorRating table (dynamic criteria)',
    check: `SELECT 1 FROM information_schema.tables WHERE table_name='EducatorRating'`,
    sql: `CREATE TABLE IF NOT EXISTS "EducatorRating" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "categoryId" TEXT NOT NULL REFERENCES "RecognitionCategory"("id") ON DELETE CASCADE,
      "period" TEXT NOT NULL,
      "scores" JSONB NOT NULL DEFAULT '{}',
      "comment" TEXT,
      "ratedById" TEXT NOT NULL REFERENCES "User"("id"),
      "finalized" BOOLEAN NOT NULL DEFAULT false,
      "finalizedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE ("userId", "categoryId", "period")
    )`,
  },
  {
    label: 'Seed STEM recognition category (5 KRAs, hackathon removed)',
    check: `SELECT 1 FROM "RecognitionCategory" WHERE name = 'STEM Educators'`,
    sql: `
      INSERT INTO "RecognitionCategory" ("id", "name", "groupId")
      SELECT 'stem-rc-' || substr(md5(random()::text), 1, 20), 'STEM Educators', eg.id
      FROM "EducatorGroup" eg
      WHERE eg.name ILIKE '%STEM%'
      LIMIT 1
      ON CONFLICT ("groupId") DO NOTHING;

      INSERT INTO "RatingCriterion" ("id", "categoryId", "label", "order", "isAutoTest")
      SELECT 'stem-rc-crit-' || substr(md5(random()::text || v.label), 1, 16), rc.id, v.label, v.ord, v.auto
      FROM "RecognitionCategory" rc
      CROSS JOIN (VALUES
        ('STEM Model Activity Kit Completion', 1, false),
        ('Student Test Conduction', 2, false),
        ('Software Training & On-Site Technical Work', 3, false),
        ('STEM Data Entry on Excel Sheets', 4, false),
        ('Sub-Departments, Event Planning & Coordination', 5, false),
        ('Student Test Understanding', 6, true)
      ) AS v(label, ord, auto)
      WHERE rc.name = 'STEM Educators'
      AND NOT EXISTS (SELECT 1 FROM "RatingCriterion" WHERE "categoryId" = rc.id);
    `,
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
