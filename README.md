# RYSEN Learning Centre

Professional development + student testing portal for RYSEN Group of Schools (15 campuses, 50+ educators).

Built with Next.js App Router · Prisma 7.8.0 · PostgreSQL (Neon.tech) · Tailwind CSS v4 · Groq AI · Vercel

Live: **https://rysen-learning-system.vercel.app**

---

## Portals

| Portal | URL | Who |
|---|---|---|
| Educator | `/login` | Teachers — training, tasks, resources, students |
| Principal | `/principal/login` | Campus heads — oversight + own training |
| Student | `/student/login` | Students — take tests, leaderboard |
| Admin | `/admin/login` | RYSEN admins — manage everything |

Root `/` auto-redirects based on session role.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (`@theme inline`, no config file) |
| ORM | Prisma 7.8.0 with `@prisma/adapter-pg` |
| Database | PostgreSQL on Neon.tech (free tier — auto-pauses) |
| AI | Groq cloud — Llama 3.3 70b |
| Email | Resend (batch API — up to 100/call) |
| WhatsApp | Twilio API (falls back to `wa.me` links) |
| File Upload | Vercel Blob |
| Excel export | `xlsx` v0.18.5 |
| Deployment | Vercel |

---

## Environment Variables

```env
# Required
DATABASE_URL=               # Neon.tech PostgreSQL connection string
GROQ_API_KEY=               # Groq cloud API key (Llama 3.3 70b)

# Email reminders
RESEND_API_KEY=             # Resend API key
RESEND_FROM_EMAIL=          # Verified sender e.g. RYSEN Learning Centre <noreply@aits.group>

# WhatsApp (optional — falls back to wa.me links)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=       # e.g. whatsapp:+14155238886

# File uploads (optional — requires Vercel Blob store linked)
BLOB_READ_WRITE_TOKEN=      # Auto-added when Blob store linked in Vercel dashboard

# App URL for reminder links
NEXT_PUBLIC_APP_URL=        # e.g. https://rysen-learning-system.vercel.app
```

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Database migration runs automatically on first admin page load (`POST /api/admin/migrate`). Subsequent runs skipped via `sessionStorage` key `rysen_migrated_v22`. Uses `IF NOT EXISTS` guards — safe to re-run.

---

## Project Structure

```
app/
├── admin/                  # Admin portal
│   ├── dashboard/
│   ├── campuses/           # Campus CRUD
│   ├── educators/          # Educator management + bulk upload
│   ├── principals/
│   ├── programs/           # Training programs
│   ├── stages/             # Stages + MCQ builder (grouped by program, accordion)
│   ├── students/           # Student management + bulk upload
│   ├── student-tests/      # Test management
│   ├── test-results/       # Results sheet + Excel export
│   ├── tasks/              # Task directory + visibility control
│   ├── educator-groups/    # Named educator groups (e.g. STEM Educators)
│   ├── resources/          # Resource library CRUD + file upload
│   ├── ai-assistant/       # RYSEN AI (15 tools, agentic loop)
│   ├── analytics/          # AI analytics + Excel export
│   ├── reports/            # Branch-wise pass % report
│   └── admins/             # Admin user management
│
├── educator/               # Educator portal
│   ├── dashboard/
│   ├── profile/            # View/edit profile, phone, stats
│   ├── stage/[id]/         # Take training stage + MCQ
│   ├── certificate/
│   ├── tasks/              # Assigned tasks + AI assistant
│   ├── resources/          # Browse shared resources (pinned, grouped by category)
│   ├── students/
│   └── student-tests/
│
├── principal/              # Principal portal
│   ├── dashboard/
│   ├── campus/             # Branch educator progress
│   ├── my-journey/
│   └── stage/[id]/
│
├── student/                # Student portal
│   ├── dashboard/          # Available tests (branch-filtered)
│   ├── test/[id]/          # Take test (timed MCQ)
│   └── leaderboard/
│
├── api/                    # API routes (all force-dynamic)
│   ├── auth/               # login, logout, me, profile, student
│   ├── branches/           # Campus CRUD + ?counts=1
│   ├── educators/          # CRUD + bulk import
│   ├── programs/           # CRUD + enroll
│   ├── stages/             # CRUD + questions
│   ├── mcq/                # Randomised question fetch
│   ├── progress/           # Stage attempt submit + doc-read
│   ├── students/           # CRUD + bulk + export
│   ├── student-tests/      # CRUD + attempt submit
│   ├── tasks/              # CRUD + visibility filter
│   │   └── [id]/           # remind (Resend batch + Twilio), subtasks, resources, comments
│   ├── task-groups/        # CRUD
│   ├── educator-groups/    # CRUD + member management
│   ├── resources/          # CRUD + upload (Vercel Blob)
│   ├── ai/                 # task-agent (15 tools), insights, student-insights
│   ├── notifications/      # In-app notifications (polled 30s)
│   └── admin/              # migrate, reports, educator-export, test-results,
│                           # seed-orientation-mcq, setup-stem-task, setup-stem-resources
│
├── generated/prisma/       # Prisma client output (do not edit)
└── components/             # RysenLogo, NotificationBell, Toast, ui/Button, ui/Input
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
| `ProgramEnrollment` | userId + programId |
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
| `Task` | groupId, title, notes, deadline, priority (LOW/NORMAL/HIGH), visibility (ALL_ADMINS/PRIVATE), createdById |
| `SubTask` | taskId, title, deadline, order |
| `TaskResource` | taskId, type, title, url, description |
| `TaskAssignment` | taskId + userId (unique pair), completedAt |
| `SubTaskProgress` | on TaskAssignment — subtaskId, completed |
| `TaskComment` | taskId, userId, text |
| `TaskGroup` | title, description, color, createdById |

> **Critical:** `SubTaskProgress` lives on `TaskAssignment`, not `Task`. Each educator tracks progress independently. Querying `progress` on `Task` causes a Prisma type error.

### Educator Groups

| Model | Key fields |
|---|---|
| `EducatorGroup` | name, description, color |
| `EducatorGroupMember` | groupId + userId (unique pair) |

### Resources

| Model | Key fields |
|---|---|
| `Resource` | title, description, url (nullable), type (DRIVE/SHEET/DOC/VIDEO/PDF/LINK), category, isPublished, isPinned, branchId |

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
- **Campus management** — add, edit, delete campuses
- **Educator management** — add, edit, bulk import via Excel, phone update
- **Program + Stage builder** — MCQ questions, doc upload, pass score config, grouped accordion UI
- **Student management** — bulk import, branch-wise
- **Student test builder** — publish/draft, branch-scoped
- **Task Directory** — create tasks with subtasks, resources, notes; `visibility: PRIVATE` hides from other admins
- **Educator Groups** — named groups (e.g. STEM Educators); assign entire group to task in one click
- **Task visibility** — ALL_ADMINS (shared) or PRIVATE (creator only)
- **Resource Library** — CRUD for Drive/Sheet/Doc/Video/PDF/Link; pin, hide, campus-scope; file upload via Vercel Blob
- **Send reminders** — Resend batch email + Twilio WhatsApp + in-app notification
- **RYSEN AI** — Llama 3.3 70b agentic loop (15 tools): create/update/delete tasks, assign educators, educator groups, subtasks, resources, reminders, branches
- **Branch Reports** — pass % per campus (educators + students) with Excel export
- **AI Analytics** — Groq-powered insights on training + test data

### Educator
- **Training journey** — stage-by-stage MCQ with badges, progress tracking
- **Profile** — view stats (stages passed, avg score, tasks), edit phone
- **Task Dashboard** — assigned tasks only, subtask completion, AI chat, resource links
- **Resources** — browse shared library (pinned first, grouped by category, type filter)
- **Student management** — add/manage own students, create tests
- **Notifications** — in-app bell polled every 30s

### Student
- Take timed MCQ tests (branch-filtered)
- Leaderboard

### Principal
- Campus overview — educator training pass rates
- Own training journey (same stage system as educators)

---

## Brand Colors (Tailwind CSS v4 `@theme inline`)

| Token | Hex | Usage |
|---|---|---|
| `midnight` | `#033D4C` | Primary — nav, buttons, headings |
| `forest` | `#225632` | Success, completed states |
| `gold` | `#FECB08` | Accent, highlights, badges |
| `olive` | `#7D783E` | Secondary accent |
| `charcoal` | `#40403E` | Body text |

---

## Architecture Notes

**Neon auto-pause** — DB sleeps on free tier. All API routes export `dynamic = 'force-dynamic'`. Connection timeout 10s.

**Migration** — Raw SQL via `POST /api/admin/migrate`. Runs once per browser session (`sessionStorage` key `rysen_migrated_v22`). `IF NOT EXISTS` guards make re-runs safe.

**Prisma output** — Generates to `app/generated/prisma/`. Import via `@/lib/db`. Run `npx prisma generate` after schema changes before build.

**Next.js params** — Dynamic route params are Promises in this version. Always `const { id } = await params`.

**Email** — Resend batch API (`resend.batch.send()`): one call for up to 100 recipients. Avoids per-email rate limit. From address: `RYSEN Learning Centre <noreply@aits.group>` (domain verified via Cloudflare DNS).

**WhatsApp** — Twilio if `TWILIO_*` env vars set; falls back to `wa.me/{e164}?text=...` links. E.164 normalisation adds `+91` prefix for Indian numbers.

**File Upload** — Vercel Blob (`@vercel/blob`). Max 50MB. Requires Blob store created in Vercel Dashboard → Storage and linked to project.

**RYSEN AI agent** — Agentic loop (max 5 iterations). 15 Groq function-calling tools. `JSON.parse(args) ?? {}` guards against null args from Groq on no-parameter tools.

**Task visibility** — `visibility` column on `Task`. `ALL_ADMINS` (default) visible to all admins; `PRIVATE` visible only to creator. Filter: `OR: [{ createdById: user.id }, { visibility: 'ALL_ADMINS' }]`.

**One-time setup endpoints** (POST, admin-only):
- `POST /api/admin/seed-orientation-mcq` — seeds MCQ questions into Orientation Program stages
- `POST /api/admin/setup-stem-task` — creates STEM Educators group + July data task
- `POST /api/admin/setup-stem-resources` — seeds STEM Data, STEM Curriculum, STEM Materials, R&D 2026-27 resources
