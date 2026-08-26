# RYSEN Learning Centre

A multi-tenant, AI-integrated operations platform unifying educator professional development, student assessment, task orchestration, and campus-level analytics for RYSEN Group of Schools across 15 campuses and 50+ educators. Engineered as a dynamically extensible system of record — programmes, testing modules, task workflows, resource governance, and communication channels are all modeled as first-class, independently composable entities rather than hardcoded flows, letting the platform absorb new campuses, cohorts, and training tracks without structural rework.

**Core capability pillars**
- **Programme & Assessment Engine** — configurable multi-stage training programmes with MCQ/text evaluation, pass-threshold logic, attempt tracking, and automated per-programme e-certification
- **Task Orchestration** — hierarchical task/subtask assignment with role-scoped visibility, completion audit trails, and full historical timelines
- **Applied AI Layer** — Groq-hosted Llama 3.3 70B agentic tool-use loop driving autonomous task management, and LLM-generated analytical insight across training and test-performance data
- **Operational Analytics** — campus-wise pass-rate reporting, subject-level performance heatmaps, stage-dropout funnels, and at-risk cohort detection
- **Governed Communication** — group-scoped resource distribution, live educator chat, and broadcast messaging (email + WhatsApp) with contextual resource attachment

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

## Technical Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                            Browser Clients                            │
│   Admin portal · Educator portal · Principal portal · Student portal  │
└───────────────────────────────┬────────────────────────────────────┬─┘
                                 │ HTTPS                    HTTP-only  │
                                 ▼                           cookies  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    Next.js 16 App Router (Vercel, serverless)         │
│  ┌────────────────┐  ┌───────────────────┐  ┌───────────────────┐    │
│  │  app/*/page.tsx │  │  app/api/**/route │  │  app/api/admin/    │   │
│  │  (client comps) │─▶│  .ts (force-      │  │  migrate (raw SQL, │   │
│  │                  │  │  dynamic)         │  │  IF NOT EXISTS)    │   │
│  └────────────────┘  └─────────┬─────────┘  └───────────────────┘    │
└──────────────────────────────────┼────────────────────────────────────┘
                                    │ Prisma Client (adapter-pg)
                                    ▼
                     ┌──────────────────────────┐
                     │  PostgreSQL — Neon.tech   │
                     │  (serverless, auto-pause) │
                     └──────────────────────────┘
                                    │
        ┌───────────────┬──────────┼───────────────┬───────────────────┐
        ▼               ▼          ▼                ▼                   ▼
   ┌─────────┐   ┌────────────┐ ┌────────┐  ┌───────────────┐  ┌─────────────────┐
   │ Groq AI │   │  Resend    │ │ Twilio │  │  Vercel Blob   │  │ Google Sheets    │
   │ Llama    │   │  (email    │ │(WhatsApp│  │ (resource file │  │ (OAuth2 refresh  │
   │ 3.3 70b  │   │  batch)    │ │ or wa.me)│  │  uploads)      │  │  token — student │
   │ agentic  │   │            │ │         │  │                │  │  roster + result │
   │ loop     │   │            │ │         │  │                │  │  live sync)      │
   └─────────┘   └────────────┘ └────────┘  └───────────────┘  └─────────────────┘
                                    │
                                    ▼
                     ┌──────────────────────────┐
                     │      Vercel Cron          │
                     │  daily cleanup (notifs +  │
                     │  orphaned blobs), guarded │
                     │  by CRON_SECRET bearer    │
                     └──────────────────────────┘
```

**Request flow (typical write):** browser → API route (`force-dynamic`, no caching) → `getSession()` reads `rysen_session` cookie → role check → Prisma query via `lib/db.ts` (pooled `pg` connection, `@prisma/adapter-pg`) → Neon Postgres → JSON response.

**Auth flow:** password-based since the [password auth migration](#authentication) — bcrypt hash stored on `User.password`, session token in an HTTP-only cookie looked up against the `Session` table (not JWT — every request hits the DB). First login for any admin-created account goes through a one-time "claim your account" step (`POST /api/auth/set-password`) before password-based sign-in works.

**Self-healing schema:** most schema changes ship as idempotent raw SQL in `app/api/admin/migrate/route.ts`'s `MIGRATIONS` array (`ADD COLUMN IF NOT EXISTS`, etc.), triggered once per browser session after admin login. A few auth-critical columns (e.g. `User.password`) also have an inline `ensurePasswordColumns()` self-heal in `lib/password.ts`, since login must work *before* an authenticated session exists to run the full migration route.

**No message queue / background workers** — the only scheduled job is the Vercel Cron daily cleanup. Everything else is synchronous request/response, with a few fire-and-forget `.catch(() => {})` calls (e.g. Google Sheets sync on test submission) so a slow external API never blocks the user-facing response.

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

# Google Sheets live sync (optional — student roster + test results)
GOOGLE_CLIENT_ID=           # OAuth2 client ID (installed-app credentials)
GOOGLE_CLIENT_SECRET=       # OAuth2 client secret
GOOGLE_REFRESH_TOKEN=       # One-time OAuth consent → refresh token (see lib/google-sheets.ts)
GOOGLE_SHEETS_ID=           # Target spreadsheet ID

# Vercel Cron auth (required if cron job enabled in vercel.json)
CRON_SECRET=                # Bearer token checked on GET /api/admin/cleanup

# App URL for reminder links
NEXT_PUBLIC_APP_URL=        # e.g. https://rysen-learning-system.vercel.app
```

> **Why OAuth2 refresh token instead of a service account key?** Many Google Workspace orgs enforce `iam.disableServiceAccountKeyCreation`, which blocks downloading service-account JSON keys entirely. The refresh-token flow (one-time local consent script, see `lib/google-sheets.ts`) works under that policy since it authenticates as a real Google user, not a service account.

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Database migration runs automatically on first admin page load (`POST /api/admin/migrate`). Subsequent runs skipped via `sessionStorage` key `rysen_migrated_v24` (bump this key whenever a new migration entry is added, to force it to re-run in every open browser tab). Uses `IF NOT EXISTS` guards — safe to re-run.

---

## Project Structure

```
app/
├── admin/                  # Admin portal
│   ├── dashboard/
│   ├── campuses/           # Campus CRUD
│   ├── educators/          # Educator management, bulk upload/delete,
│   │                       # branch-accordion grouping, password reset
│   ├── principals/
│   ├── programs/           # Training programs
│   ├── stages/             # Stages + MCQ builder (grouped by program, accordion)
│   ├── students/           # Student management, bulk upload/delete, branch-accordion,
│   │                       # Google Sheets sync button
│   ├── student-tests/      # Test management
│   ├── test-results/       # Results sheet + Excel export
│   ├── tasks/              # Task directory + visibility control
│   ├── task-history/       # Full task timeline: created/assigned/completed per educator
│   ├── educator-groups/    # Named educator groups (e.g. STEM Educators) + group chat
│   ├── resources/          # Resource library CRUD + file upload + group visibility
│   ├── broadcasts/         # Email/WhatsApp announcements, optional linked resource
│   ├── ai-assistant/       # RYSEN AI (15 tools, agentic loop)
│   ├── analytics/          # AI analytics + Excel export
│   ├── reports/            # Branch-wise pass % report
│   ├── admins/             # Admin user management + password reset
│   └── settings/           # Manual cleanup trigger + cron status
│
├── educator/               # Educator portal
│   ├── dashboard/
│   ├── profile/            # View/edit profile, phone, stats
│   ├── stage/[id]/         # Take training stage + MCQ
│   ├── certificate/        # Per-programme e-certificates (auto-unlock on completion)
│   ├── programs/           # Browse + self-enroll in published programmes
│   ├── groups/             # My Groups — 5s-polled chat + group resources
│   ├── analytics/          # Class analytics: subject heatmap, stage dropout, at-risk
│   ├── tasks/              # Assigned tasks + AI assistant
│   ├── resources/          # Browse shared resources (pinned, grouped by category)
│   ├── students/           # Manage own students, bulk select/delete
│   ├── students/progress/  # Per-student test performance dashboard
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
│   ├── auth/               # login, admin, set-password, logout, me, profile, student
│   ├── branches/           # Campus CRUD + ?counts=1
│   ├── educators/          # CRUD + bulk import/delete + password reset
│   ├── admins/             # role management + password reset
│   ├── programs/           # CRUD + enroll
│   ├── stages/             # CRUD + questions
│   ├── mcq/                # Randomised question fetch, auto-fires certificate notification
│   ├── progress/           # Stage attempt submit + doc-read
│   ├── students/           # CRUD + bulk import/delete + export + progress
│   ├── student-tests/      # CRUD + attempt submit (fire-and-forget Sheets sync)
│   ├── tasks/              # CRUD + visibility filter
│   │   └── [id]/           # remind (Resend batch + Twilio), subtasks, resources, comments
│   ├── task-groups/        # CRUD
│   ├── educator-groups/    # CRUD + member management + messages (group chat)
│   ├── resources/          # CRUD + upload (Vercel Blob) + group-scoped visibility
│   ├── broadcasts/         # Email + WhatsApp send, optional resource attachment
│   ├── certificate/        # Per-programme or legacy certificate data
│   ├── educator/           # certificates (overview list), analytics (class-level)
│   ├── ai/                 # task-agent (15 tools), insights, student-insights
│   ├── notifications/      # In-app notifications (polled 30s)
│   └── admin/              # migrate, cleanup (cron), reports, educator-export,
│                           # test-results, task-history, students/sheet,
│                           # seed-orientation-mcq, setup-stem-task, setup-stem-resources,
│                           # setup-north-south-resources
│
├── generated/prisma/       # Prisma client output (do not edit)
└── components/             # RysenLogo, NotificationBell, Toast, ui/Button, ui/Input

lib/
├── db.ts                   # Prisma client singleton (pg pool + adapter-pg)
├── auth.ts                 # Session cookie helpers (staff)
├── student-auth.ts         # Session cookie helpers (students)
├── password.ts             # bcrypt hash/verify + self-healing column migration
└── google-sheets.ts        # OAuth2 refresh-token Sheets API client
```

---

## Data Models

### Core

| Model | Key fields |
|---|---|
| `Branch` | id, name, location |
| `User` (staff) | id, name, email, phone, password (bcrypt hash), passwordSetAt, role, branchId |
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
| `GroupMessage` | groupId, userId, text, createdAt — 5s-polled group chat |

### Resources

| Model | Key fields |
|---|---|
| `Resource` | title, description, url (nullable), type (DRIVE/SHEET/DOC/VIDEO/PDF/LINK), category, isPublished, isPinned, branchId, groupId (nullable — null = visible to all educators, set = restricted to that group) |

### Notifications

| Model | Key fields |
|---|---|
| `Notification` | userId, title, message, type, read, relatedId |

---

## Authentication

- Staff (admin/educator/principal): HTTP-only cookie `rysen_session`, looked up against the `Session` table (DB-backed, not JWT)
- Students: HTTP-only cookie `rysen_student_session`, name + class + campus (no password — low-stakes, kiosk-style login)
- **Admin/educator now require a password** (`POST /api/auth/admin`, `POST /api/auth/login` — bcrypt via `lib/password.ts`)
  - First login for any admin-created account: `POST /api/auth/set-password` verifies name+email match, then lets that person set their own password and auto-signs them in
  - A `NO_PASSWORD` error code on sign-in tells the frontend to route to the setup flow instead of just failing
  - Admins can force a reset (`resetPassword: true` on `PUT /api/educators/[id]` or `PUT /api/admins/[id]`) — sets `password` back to `null`, forcing that account through setup again on next login
  - Existing sessions are unaffected by a password reset — only future logins are gated
- Role-based redirects from root `/`

---

## Key Features

### Admin
- **Campus management** — add, edit, delete campuses
- **Educator management** — add, edit, bulk import via Excel, phone update, branch-accordion grouping, bulk select + delete, force password reset
- **Program + Stage builder** — MCQ questions, doc upload, pass score config, grouped accordion UI
- **Student management** — bulk import/delete, branch-accordion grouping, Google Sheets live sync (roster + results)
- **Student test builder** — publish/draft, branch-scoped
- **Task Directory** — create tasks with subtasks, resources, notes; `visibility: PRIVATE` hides from other admins
- **Task History** — full timeline per task: created date/creator, per-educator assigned/completed timestamps, subtask progress, overdue flagging
- **Educator Groups** — named groups (e.g. STEM Educators); assign entire group to task in one click; group chat + group-scoped resources
- **Task visibility** — ALL_ADMINS (shared) or PRIVATE (creator only)
- **Resource Library** — CRUD for Drive/Sheet/Doc/Video/PDF/Link; pin, hide, campus-scope, group-scope; file upload via Vercel Blob
- **Broadcasts** — email + WhatsApp announcements with an optional linked resource card, so a "new resource added" broadcast doubles as a notification
- **Send reminders** — Resend batch email + Twilio WhatsApp + in-app notification
- **RYSEN AI** — Llama 3.3 70b agentic loop (15 tools): create/update/delete tasks, assign educators, educator groups, subtasks, resources, reminders, branches
- **Branch Reports** — pass % per campus (educators + students) with Excel export
- **AI Analytics** — Groq-powered insights on training + test data
- **Settings** — manual trigger + status for the daily cleanup cron (old notifications, orphaned blobs)
- **Admin password reset** — Super Admin can force any admin/educator back to first-time setup

### Educator
- **Training journey** — stage-by-stage MCQ with badges, progress tracking
- **Profile** — view stats (stages passed, avg score, tasks), edit phone
- **Programmes** — browse published programmes and self-enroll
- **Per-programme e-certificates** — auto-unlocks (with an in-app notification) the moment every stage in an enrolled programme is passed; overview page lists progress across all enrolled programmes
- **My Groups** — group chat (5s polling) with fellow educators in the same group, plus group-scoped shared resources
- **Class Analytics** — subject-performance bars, score-distribution heatmap, per-programme stage dropout funnel, at-risk student list, weekly engagement trend
- **Task Dashboard** — assigned tasks only, subtask completion, AI chat, resource links
- **Resources** — browse shared library (pinned first, grouped by category, type filter, group-restricted items only visible to members)
- **Student management** — add/manage own students, create tests, bulk select + delete
- **Student Progress Dashboard** — per-student score/engagement table with subject breakdown and at-risk flagging
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

**Migration** — Raw SQL via `POST /api/admin/migrate`. Runs once per browser session (`sessionStorage` key `rysen_migrated_v24`). `IF NOT EXISTS` guards make re-runs safe. Auth-critical columns additionally self-heal inline (see **Password auth** below) since login has to work before an authenticated session exists to trigger this route.

**Prisma output** — Generates to `app/generated/prisma/`. Import via `@/lib/db`. Run `npx prisma generate` after schema changes before build.

**Next.js params** — Dynamic route params are Promises in this version. Always `const { id } = await params`.

**Email** — Resend batch API (`resend.batch.send()`): one call for up to 100 recipients. Avoids per-email rate limit. From address: `RYSEN Learning Centre <noreply@aits.group>` (domain verified via Cloudflare DNS).

**WhatsApp** — Twilio if `TWILIO_*` env vars set; falls back to `wa.me/{e164}?text=...` links. E.164 normalisation adds `+91` prefix for Indian numbers.

**File Upload** — Vercel Blob (`@vercel/blob`). Max 50MB. Requires Blob store created in Vercel Dashboard → Storage and linked to project.

**RYSEN AI agent** — Agentic loop (max 5 iterations). 15 Groq function-calling tools. `JSON.parse(args) ?? {}` guards against null args from Groq on no-parameter tools.

**Task visibility** — `visibility` column on `Task`. `ALL_ADMINS` (default) visible to all admins; `PRIVATE` visible only to creator. Filter: `OR: [{ createdById: user.id }, { visibility: 'ALL_ADMINS' }]`.

**Resource visibility** — `groupId` column on `Resource`. `null` = visible to every educator; set = visible only to `groupId`'s members. Educator-facing query: `OR: [{ groupId: null }, { groupId: { in: userGroupIds } }]`.

**Password auth** — bcrypt hashes (`lib/password.ts`, 10 salt rounds), never plaintext. `ensurePasswordColumns()` runs `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` inline on every auth request (memoised after first success) — a self-heal that sidesteps the chicken-and-egg problem of the full migrate route requiring an already-authenticated session. Generic `PUT /api/educators/[id]` explicitly strips `password`/`passwordSetAt` from the request body before it reaches Prisma, so password changes can only happen through the hashed set-password/reset-password paths.

**Per-programme certificates** — `GET /api/certificate?programId=X` checks `ProgramEnrollment` + every `Stage` under that `programId` has `StageProgress.passed = true` for the user. Omitting `programId` falls back to the legacy 5-stage track (`Stage.programId IS NULL`) for accounts that predate the multi-programme model. `POST /api/mcq/[stageId]` checks after every newly-passed attempt whether it completed the whole programme and, if so, fires a `Notification` (type `CERTIFICATE`) — that's the "auto-unlock".

**Google Sheets sync** — `lib/google-sheets.ts` exchanges `GOOGLE_REFRESH_TOKEN` for a short-lived access token on each call (plain `fetch`, no `googleapis` package) and talks to the Sheets API v4 REST endpoints directly. Chosen over a service-account key because many Google Workspace orgs enforce `iam.disableServiceAccountKeyCreation`. `POST /api/student-tests/[id]/attempt` fires a fire-and-forget `updateStudentRow()` call after grading, so a slow/failed Sheets write never blocks the student's test result.

**Cron cleanup** — `vercel.json` schedules `GET /api/admin/cleanup` daily (`0 2 * * *`), authenticated via `Authorization: Bearer ${CRON_SECRET}`. Deletes read notifications older than 30 days, unread notifications older than 90 days, and orphaned Vercel Blob files under the `resources/` prefix no longer referenced by any `Resource.url`. Same endpoint accepts an admin-session `POST` for a manual "Run Now" from `/admin/settings`.

**One-time setup endpoints** (POST, admin-only):
- `POST /api/admin/seed-orientation-mcq` — seeds MCQ questions into Orientation Program stages
- `POST /api/admin/setup-stem-task` — creates STEM Educators group + July data task
- `POST /api/admin/setup-stem-resources` — seeds STEM Data, STEM Curriculum, STEM Materials, R&D 2026-27 resources
- `POST /api/admin/setup-north-south-resources` — seeds the North/South Campus weekly-meeting + SOP resources into the matching `EducatorGroup`
