# RYSEN Learning Centre

Professional development + student testing portal for RYSEN Group of Schools (15 campuses, 50+ educators).

Built with Next.js App Router · Prisma 7.8.0 · PostgreSQL (Neon.tech) · Tailwind CSS v4 · Groq AI · Vercel

---

## Portals

| Portal | URL | Who |
|---|---|---|
| Educator | `/login` | Teachers — training, tasks, students |
| Principal | `/principal/login` | Campus heads — oversight + own training |
| Student | `/student/login` | Students — take tests, leaderboard |
| Admin | `/admin/login` | RYSEN admins — manage everything |

Root `/` auto-redirects based on session role.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (`@theme inline`, no config file) |
| ORM | Prisma 7.8.0 with `@prisma/adapter-pg` |
| Database | PostgreSQL on Neon.tech (free tier — auto-pauses) |
| AI | Groq cloud — Llama 3.3 70b |
| Email | Resend v6 |
| WhatsApp | `wa.me` links (no API cost) |
| Excel export | `xlsx` v0.18.5 |
| Deployment | Vercel |

---

## Environment Variables

```env
# Required
DATABASE_URL=           # Neon.tech PostgreSQL connection string
GROQ_API_KEY=           # Groq cloud API key (Llama 3.3 70b)

# Required for email reminders
RESEND_API_KEY=         # Resend API key
RESEND_FROM_EMAIL=      # Verified sender e.g. noreply@rysengroup.com

# Required for task reminder links in emails/WhatsApp
NEXT_PUBLIC_APP_URL=    # e.g. https://rysen-learning-centre.vercel.app
```

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Database migration runs automatically on first admin login (via `POST /api/admin/migrate`). Subsequent runs are skipped using `sessionStorage` key `rysen_migrated_v19`.

---

## Project Structure

```
app/
├── admin/              # Admin portal
│   ├── dashboard/
│   ├── campuses/       # Campus CRUD
│   ├── educators/      # Educator management + bulk upload
│   ├── principals/
│   ├── programs/       # Training programs
│   ├── stages/         # Stages + MCQ builder
│   ├── students/       # Student management + bulk upload
│   ├── student-tests/  # Test management
│   ├── test-results/   # Results sheet + Excel export
│   ├── tasks/          # Task directory + detail
│   ├── ai-assistant/   # RYSEN AI (GPT-style, 11 tools)
│   ├── analytics/      # AI analytics + Excel export
│   ├── reports/        # Branch-wise pass % report
│   └── admins/         # Admin user management
│
├── educator/           # Educator portal
│   ├── dashboard/
│   ├── profile/        # View/edit profile, phone, stats
│   ├── stage/[id]/     # Take training stage + MCQ
│   ├── certificate/
│   ├── tasks/          # Assigned tasks + AI assistant
│   ├── students/
│   └── student-tests/
│
├── principal/          # Principal portal
│   ├── dashboard/
│   ├── campus/         # Branch educator progress
│   ├── my-journey/
│   └── stage/[id]/
│
├── student/            # Student portal
│   ├── dashboard/      # Available tests (branch-filtered)
│   ├── test/[id]/      # Take test (timed MCQ)
│   └── leaderboard/
│
├── api/                # API routes (all force-dynamic)
│   ├── auth/           # login, logout, me, profile, student
│   ├── branches/       # Campus CRUD + ?counts=1
│   ├── educators/      # CRUD + bulk import
│   ├── programs/       # CRUD + enroll
│   ├── stages/         # CRUD + questions
│   ├── mcq/            # Randomised question fetch
│   ├── progress/       # Stage attempt submit + doc-read
│   ├── students/       # CRUD + bulk + export
│   ├── student-tests/  # CRUD + attempt submit
│   ├── tasks/          # CRUD + subtasks + resources + remind + ai-chat
│   ├── task-groups/    # CRUD
│   ├── ai/             # task-agent (11 tools), insights, student-insights
│   ├── notifications/  # In-app notifications (polled 30s)
│   └── admin/          # migrate, reports, educator-export, test-results
│
├── generated/prisma/   # Prisma client output (do not edit)
└── components/         # RysenLogo, NotificationBell, ui/Button, ui/Input
```

---

## Data Models

### Core

| Model | Key fields |
|---|---|
| `Branch` | id, name, location |
| `User` (staff) | id, name, email, phone, role, branchId |
| `Session` | userId, token, expiresAt |

### Training

| Model | Key fields |
|---|---|
| `Program` | name, isPublished, applicableTo (BOTH/EDUCATOR/PRINCIPAL) |
| `ProgramEnrollment` | userId + programId (unique pair) |
| `Stage` | programId, number, title, docs (Json), timeLimitMinutes, passScore, maxAttempts |
| `Question` | stageId, type (MCQ/TEXT), text, options (Json), correctId |
| `StageProgress` | userId + stageId (unique), attempts, bestScore, passed, docRead |

### Students & Tests

| Model | Key fields |
|---|---|
| `Student` | name, class, section, branchId |
| `StudentTest` | title, subject, targetClass, timeLimitMinutes, passScore, isPublished, branchId |
| `StudentAttempt` | studentId, testId, score, passed, answers (Json) |

### Task System

| Model | Key fields |
|---|---|
| `Task` | groupId, title, notes, deadline, priority (LOW/NORMAL/HIGH) |
| `SubTask` | taskId, title, deadline |
| `TaskResource` | taskId, type, title, url, description |
| `TaskAssignment` | taskId + userId (unique pair) |
| `SubTaskProgress` | **on TaskAssignment** (not Task) — subtaskId, completed |
| `TaskComment` | taskId, userId, text |

> **Critical:** `SubTaskProgress` is on `TaskAssignment`, not `Task`. Each educator tracks progress independently per assignment. Querying `progress` on `Task` causes a Prisma type error.

### Notifications

| Model | Key fields |
|---|---|
| `Notification` | userId, title, message, type, read, relatedId |

---

## Authentication

- Staff (admin/educator/principal): HTTP-only cookie `rysen_session`
- Students: HTTP-only cookie `rysen_student_session`
- No passwords — login by name + email + campus (staff) or name + class + campus (students)
- Role-based redirects from root `/`

---

## Key Features

### Admin
- Campus management — add, edit, delete campuses (blocked if educators/students attached)
- Educator management — add, edit, bulk import via Excel, phone number update
- Program + Stage builder — MCQ questions, doc upload, pass score config
- Student management — bulk import, branch-wise
- Student test builder — publish/draft, branch-scoped
- Task Directory — create tasks with subtasks (deadlines), resources (descriptions), notes, assign educators
- Send reminders — email (Resend) + WhatsApp (`wa.me` links) + in-app notification per task
- RYSEN AI — GPT-style agent with 11 tools (create/update/delete tasks, assign educators, add subtasks/resources)
- Branch Reports — pass % per campus (educators + students) with Excel export
- AI Analytics — Groq-powered insights on training + test data

### Educator
- Training journey — stage-by-stage MCQ with badges, progress tracking
- Profile page — view stats (stages passed, avg score, tasks), edit phone number
- Task Dashboard — assigned tasks, subtask completion, AI chat assistant, resource links
- Student management — add/manage own students, create tests
- Notifications — in-app bell polled every 30s

### Student
- Take timed MCQ tests (branch-filtered — only sees tests for their campus)
- Leaderboard

### Principal
- Campus overview — educator training pass rates
- Own training journey (same stage system as educators)

---

## Brand Colors (Tailwind CSS v4)

| Name | Hex | Usage |
|---|---|---|
| `midnight` | `#033D4C` | Primary — nav, buttons, headings |
| `forest` | `#225632` | Success, completed states |
| `gold` | `#FECB08` | Accent, highlights, badges |
| `olive` | `#7D783E` | Principal accent, secondary |
| `charcoal` | `#40403E` | Body text |
| `cream` | (bg-cream) | Page background |

---

## Architecture Notes

**Neon.tech auto-pause** — DB sleeps on free tier. All API routes must export `dynamic = 'force-dynamic'`. Connection timeout set to 10s.

**Migration** — Raw SQL via `POST /api/admin/migrate`. Runs once per browser session (`sessionStorage` key `rysen_migrated_v19`). Uses `IF NOT EXISTS` guards so re-runs are safe.

**Prisma output** — Generates to `app/generated/prisma/`. Import client via `@/lib/db`.

**Next.js params** — Dynamic route params are Promises. Always `const { id } = await params`.

**WhatsApp** — Uses `wa.me/{phone}?text=...` links. Opens WhatsApp Web with pre-filled message. No Twilio/WATI required. Educator must have phone stored in profile.

**Excel export** — Client-side via dynamic `import('xlsx')`. Both admin analytics and branch reports support multi-sheet download.

**RYSEN AI agent** — Agentic loop (max 5 rounds) with 11 Groq function-calling tools. Handles: list tasks/groups/educators, get task, create/update/delete task, assign educators, add subtask, add resource, create task group.
