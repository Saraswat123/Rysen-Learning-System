# RYSEN Learning Centre

A multi-tenant, AI-integrated operations platform unifying educator professional development, student assessment, task orchestration, and campus-level analytics for RYSEN Group of Schools across 15 campuses and 50+ educators. Engineered as a dynamically extensible system of record — programmes, testing modules, task workflows, resource governance, and communication channels are all modeled as first-class, independently composable entities rather than hardcoded flows, letting the platform absorb new campuses, cohorts, and training tracks without structural rework.

**Core capability pillars**
- **Programme & Assessment Engine** — configurable multi-stage training programmes with MCQ/text evaluation, pass-threshold logic, attempt tracking, and automated per-programme e-certification
- **Student Testing** — scheduled test windows, per-student question/option shuffle (anti-cheat), PDF/photo auto question extraction (OCR), educator-built Student Programs grouping tests by class
- **Task Orchestration** — hierarchical task/subtask assignment with role-scoped visibility, completion audit trails, and full historical timelines
- **Applied AI Layer** — Groq-hosted agentic tool-use loop driving autonomous task management + live student-test analytics queries, LLM-generated insight across training/test-performance data, and data-backed AI score suggestions for monthly recognition ratings
- **Operational Analytics** — campus-wise pass-rate reporting, subject-level performance heatmaps, stage-dropout funnels, at-risk cohort detection, and an automated weekly digest email
- **Recognition & Rewards** — admin-configurable monthly rating categories with star ratings, top-3 e-certificate unlock, and educator-facing leaderboard
- **Governed Communication** — group-scoped resource distribution, live educator chat, broadcast messaging (email + WhatsApp), automatic welcome/activate emails on account creation, and OTP-verified first-time account setup with Cloudflare Turnstile captcha on every login

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
| AI | Groq cloud — `openai/gpt-oss-120b` (tool calling) |
| Email | Brevo (primary) → Resend (fallback) — `lib/email.ts` single entry point |
| Captcha | Cloudflare Turnstile — every login + first-time setup form |
| WhatsApp | Twilio API (falls back to `wa.me` links) |
| File Upload | Vercel Blob |
| PDF/OCR | `pdfjs-dist` (text extraction) + `tesseract.js` (scanned/photo fallback), client-side |
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
GROQ_API_KEY=                # Groq cloud API key (openai/gpt-oss-120b)
AUTH_TOKEN_SECRET=           # Long random string — signs OTP setup tokens (lib/account-setup-otp.ts)

# Email — Brevo tried first, falls back to Resend if BREVO_API_KEY unset (lib/email.ts)
BREVO_API_KEY=                # Brevo transactional email API key
BREVO_FROM_EMAIL=             # Sender verified in Brevo (Senders & IP → Senders)
BREVO_FROM_NAME=              # Optional, defaults to "RYSEN Learning Centre"
RESEND_API_KEY=                # Resend API key (fallback provider)
RESEND_FROM_EMAIL=             # Verified sender e.g. RYSEN Learning Centre <noreply@aits.group>

# Captcha (optional — no-op until both are set; see lib/turnstile.ts / TurnstileWidget.tsx)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=   # Public site key, baked in at build time
TURNSTILE_SECRET_KEY=              # Server-side verification secret

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

# Vercel Cron auth (required — gates both scheduled jobs in vercel.json)
CRON_SECRET=                # Bearer token checked on GET /api/admin/cleanup and /api/admin/weekly-digest

# App URL for reminder/email links
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
│   ├── rewards/            # Monthly recognition ratings — star-rating entry, AI score
│   │                       # suggestions for data-backed criteria, finalize/certify
│   └── settings/           # Manual cleanup/digest/welcome-email triggers + cron status
│
│   # Sidebar is a grouped left nav (Campuses/Programs/Students/Operations/
│   # Insights/System), same pattern mirrored on the educator side below.
│   # app/admin/campuses/[id]/ is a tabbed per-campus hub (Educators/
│   # Principal/Students) reusing existing CRUD APIs, filtered client-side.
│
├── educator/               # Educator portal (left-sidebar nav, grouped: Students/
│   │                       # Programs/Operations/Achievements, same pattern as admin)
│   ├── dashboard/           # "Ask Rysen AI" banner + training journey
│   ├── profile/            # View/edit profile, phone, stats
│   ├── stage/[id]/         # Take training stage + MCQ
│   ├── certificate/        # Per-programme e-certificates (auto-unlock on completion)
│   ├── programs/           # Browse + self-enroll in published training programmes
│   ├── student-programs/   # NEW: educator-built named groupings of their own
│   │                       # student tests ("Term 2 STEM Track") for their class —
│   │                       # distinct from training `programs/` above
│   ├── groups/             # My Groups — 5s-polled chat + group resources
│   ├── recognition/        # Monthly recognition: star ratings, rank, leaderboard,
│   │                       # certificate download (top-3 only)
│   ├── star-students/      # Placeholder — reserved tab, not wired to data yet
│   ├── analytics/          # Class analytics: subject heatmap, stage dropout, at-risk
│   ├── tasks/              # Assigned tasks + AI assistant
│   ├── resources/          # Browse shared resources (pinned, grouped by category)
│   ├── students/           # Manage own students, bulk select/delete
│   ├── students/progress/  # Per-student test performance dashboard
│   └── student-tests/      # Create/edit tests — PDF/photo question import, shuffle
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
│   ├── student-tests/      # CRUD + attempt submit (fire-and-forget Sheets sync),
│   │                       # scheduled window (startAt/endAt) gates student access,
│   │                       # per-student question+option shuffle (lib/shuffle.ts)
│   ├── student-programs/   # CRUD — educator-built named groupings of own tests
│   ├── tasks/              # CRUD + visibility filter
│   │   └── [id]/           # remind (Resend batch + Twilio), subtasks, resources, comments
│   ├── task-groups/        # CRUD
│   ├── educator-groups/    # CRUD + member management + messages (group chat)
│   ├── resources/          # CRUD + upload (Vercel Blob) + group-scoped visibility
│   ├── broadcasts/         # Email + WhatsApp send, optional resource attachment
│   ├── certificate/        # Per-programme or legacy certificate data
│   ├── educator/           # certificates (overview list), analytics (class-level),
│   │                       # test-results, recognition (star ratings + leaderboard)
│   ├── ai/                 # task-agent (16 tools, incl. get_test_completion_stats —
│   │                       # real campus/test completion data, not guessed),
│   │                       # insights, student-insights
│   ├── auth/                # login, admin, principal, student, logout, me, profile,
│   │                       # request-setup-otp + set-password (2-step OTP claim)
│   ├── notifications/      # In-app notifications (polled 30s)
│   └── admin/              # migrate, cleanup (cron), weekly-digest (cron),
│                           # send-welcome-emails, educator-ratings (+finalize, +suggest),
│                           # recognition-categories, reports, educator-export,
│                           # test-results, task-history, students/sheet,
│                           # seed-orientation-mcq, setup-stem-task, setup-stem-resources,
│                           # setup-north-south-resources
│
├── generated/prisma/       # Prisma client output (do not edit)
└── components/
    ├── RysenLogo, NotificationBell, Toast, ui/Button, ui/Input, ui/StarRating
    ├── auth/SetupPasswordForm.tsx   # Shared 2-step OTP setup form (all 3 login pages)
    ├── auth/TurnstileWidget.tsx     # Cloudflare Turnstile widget, no-op until configured
    └── QuestionPdfImport.tsx        # PDF/photo → parsed questions, used on both
                                      # admin and educator test-question-edit pages

lib/
├── db.ts                   # Prisma client singleton (pg pool + adapter-pg)
├── auth.ts                 # Session cookie helpers (staff)
├── student-auth.ts         # Session cookie helpers (students)
├── password.ts             # bcrypt hash/verify + self-healing column migration
├── account-setup-otp.ts    # Signs/verifies the OTP claim token (jose, HS256)
├── welcome-email.ts        # "Activate your account" email, sent on every new account
├── email.ts                # Single sendEmail() — Brevo first, Resend fallback
├── turnstile.ts            # Server-side Turnstile verification (no-op until configured)
├── shuffle.ts              # Deterministic per-student seeded shuffle
├── question-extractor.ts   # Client-side PDF/OCR → structured question parser
├── weekly-digest.ts        # Computes + renders the weekly admin digest email
├── educator-ratings.ts     # Recognition category/criteria/rating compute + self-heal
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
| `Program` | name, isPublished, applicableTo (BOTH/EDUCATOR/PRINCIPAL), branches (m2m → Branch, empty = all campuses — cascades to every educator there, the only mechanism that scales to 500+ educators) |
| `ProgramEnrollment` | userId + programId |
| `Stage` | programId, number, title, docs (Json), timeLimitMinutes, passScore, maxAttempts |
| `Question` | stageId, type (MCQ/TEXT), text, options (Json), correctId |
| `StageProgress` | userId + stageId (unique), attempts, bestScore, passed, docRead |

### Students & Tests

| Model | Key fields |
|---|---|
| `Student` | name, class, section, branchId, createdById (nullable — `lib/student-scope.ts`'s `CREATED_BY_SCOPE_CUTOFF` grandfathers pre-cutoff students as branch-visible to every educator there; post-cutoff strictly scoped to creator) |
| `StudentTest` | title, subject, targetClass, timeLimitMinutes, passScore, isPublished, branchId, startAt/endAt (nullable schedule window — null = always live), programId (nullable → StudentProgram) |
| `StudentProgram` | title, description, targetClass, branchId, createdById — educator-built named grouping of their own StudentTests |
| `StudentQuestion` | testId, type, text, imageUrl, videoUrl, options (Json), correctId, order, marks |
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

### Recognition / Monthly Ratings

| Model | Key fields |
|---|---|
| `RecognitionCategory` | name, groupId (1:1 → `EducatorGroup`) |
| `RatingCriterion` | categoryId, label, order, isAutoTest (true = computed live from that educator's branch `StudentAttempt` data for the period, never admin-entered) |
| `EducatorRating` | userId, categoryId, period (`"YYYY-MM"`), scores (Json, 0-10 per criterion — rendered as 5-star `StarRating` everywhere), comment, finalized/finalizedAt |

Admin enters/edits scores per educator per month at `/admin/rewards`; **unfinalized ratings never appear to educators** — `finalize` locks the period, notifies the top 3 by rank, and unlocks their certificate download on `/educator/recognition`. A "Suggest Scores" button pre-fills *only* criteria with a real tracked signal behind them (currently: Student Test Conduction, from attempt counts) — deliberately never fabricates a score for untracked criteria like Punctuality.

### Notifications

| Model | Key fields |
|---|---|
| `Notification` | userId, title, message, type, read, relatedId |

---

## Authentication

- Staff (admin/educator/principal): HTTP-only cookie `rysen_session`, looked up against the `Session` table (DB-backed, not JWT)
- Students: HTTP-only cookie `rysen_student_session`, name + class + campus (no password — low-stakes, kiosk-style login)
- **Admin/educator now require a password** (`POST /api/auth/admin`, `POST /api/auth/login` — bcrypt via `lib/password.ts`)
  - First login for any admin-created account is a two-step, email-verified claim (`lib/account-setup-otp.ts`), not a bare name+email check:
    1. `POST /api/auth/request-setup-otp` — confirms name+email match an unset-password account, emails a 6-digit code, returns a signed JWT (jose, HS256) carrying only the code's **hash**. Response shape is identical whether or not the account exists (decoy token on miss) so account existence can't be inferred.
    2. `POST /api/auth/set-password` — requires that code back alongside the new password before it's set; only then creates the session.
  - Shared `components/auth/SetupPasswordForm.tsx` drives this 2-step flow on all three login pages (`/login`, `/admin/login`, `/principal/login`)
  - A `NO_PASSWORD` error code on sign-in tells the frontend to route to the setup flow instead of just failing
  - Every new account (single-create or bulk import) also gets an automatic "Welcome — Activate Your Account" email (`lib/welcome-email.ts`) linking to the same setup flow (`?setup=1` query param auto-selects the tab); `POST /api/admin/send-welcome-emails` bulk-sends it to any pre-existing unactivated account
  - Admins can force a reset (`resetPassword: true` on `PUT /api/educators/[id]` or `PUT /api/admins/[id]`) — sets `password` back to `null`, forcing that account through setup again on next login
  - Existing sessions are unaffected by a password reset — only future logins are gated
- **Cloudflare Turnstile captcha** on every sign-in form and the OTP-request step (`components/auth/TurnstileWidget.tsx` + `lib/turnstile.ts`) — no-op until `NEXT_PUBLIC_TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` are set, so it ships safely ahead of the keys existing
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
- **RYSEN AI** — Groq agentic loop (16 tools): create/update/delete tasks, assign educators, educator groups, subtasks, resources, reminders, branches, and `get_test_completion_stats` (real per-campus student test completion/pass-rate data, not a guess)
- **Branch Reports** — pass % per campus (educators + students) with Excel export
- **AI Analytics** — Groq-powered insights on training + test data
- **Rewards & Recognition** — monthly star-rating entry per educator group, AI-suggested scores for data-backed criteria, finalize/lock + notify top 3, Excel/PDF export
- **Student test scheduling** — optional opens-at/closes-at window per test; outside it the test just doesn't appear for students, admin/educator side always sees it with a Scheduled/Live/Ended badge
- **Weekly Digest Email** — Vercel Cron, every Sunday, mails every active admin a summary: top 5 educators (by tasks+stages completed), task stats, new resources, student-test activity, new educators onboarded. Manual "Send Now" in Settings for testing.
- **Welcome / Activate Account emails** — automatic on every new account (single or bulk-imported); "Send to Everyone Unactivated" bulk-sends it to any pre-existing account that never got it
- **Settings** — manual trigger + status for the daily cleanup cron, the weekly digest, and bulk welcome emails
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
- **Student test creation** — question bank with image/video support, scheduled open/close window, per-student question+option shuffle (anti-cheat — no two students sitting together see matching order), PDF/photo auto question extraction (OCR fallback for scanned docs, never guesses an undetected answer)
- **Student Programs** — group own tests into a named program for a class (e.g. "Term 2 STEM Track"), separate from admin's training `Program`s
- **Student Progress Dashboard** — per-student score/engagement table with subject breakdown and at-risk flagging
- **Recognition** — monthly star-rating card, category breakdown, campus leaderboard, certificate download (top 3 only), full-report download for everyone, month picker to review any finalized period
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

**Email** — `lib/email.ts` is the single `sendEmail(to, subject, html)` entry point used everywhere (welcome emails, OTP codes, weekly digest, task reminders, broadcasts, AI agent reminders, test-notification). Tries Brevo first (`BREVO_API_KEY`/`BREVO_FROM_EMAIL`) — chosen over Resend for deliverability to corporate Google Workspace domains, since Brevo only requires single-click sender verification rather than full DNS domain authentication. Falls back to Resend if Brevo isn't configured, so nothing breaks mid-rollout. Resend's batch API (`resend.batch.send()`) was dropped in favor of per-recipient `sendEmail()` calls via `Promise.all` for provider-agnostic consistency.

**WhatsApp** — Twilio if `TWILIO_*` env vars set; falls back to `wa.me/{e164}?text=...` links. E.164 normalisation adds `+91` prefix for Indian numbers.

**File Upload** — Vercel Blob (`@vercel/blob`). Max 50MB. Requires Blob store created in Vercel Dashboard → Storage and linked to project.

**RYSEN AI agent** — Agentic loop (max 8 iterations), model `openai/gpt-oss-120b` (the prior `llama-3.3-70b-versatile` was decommissioned by Groq). 16 function-calling tools. `JSON.parse(args) ?? {}` guards against null args from Groq on no-parameter tools. On a malformed tool-call (`tool_use_failed`), the retry keeps `tools` attached rather than dropping them — dropping them makes Groq default `tool_choice` to `'none'` and then reject the model's next tool-call attempt, turning one recoverable failure into a hard crash.

**Per-student test shuffle** — `lib/shuffle.ts` seeds a deterministic PRNG from `studentId:testId` (questions) and `studentId:questionId` (options within each question) — same student sees the same order on reload/resume, different students never match. Answers are already keyed by option `id` not position, so option reordering doesn't affect scoring.

**PDF question import** — `lib/question-extractor.ts`, entirely client-side (nothing uploaded to a server). Typed PDFs go through `pdfjs-dist` text extraction first (fast, exact); falls back to `tesseract.js` OCR automatically when a page yields too little text to be typed content, or always for a direct photo upload. Regex-based structural parse (numbered questions, lettered options, inline or trailing-block answer key) never guesses an answer it can't find — unanswered questions are flagged in the import preview and must be set manually before the batch can be imported.

**First-time setup OTP** — `lib/account-setup-otp.ts` signs a JWT (jose, HS256) carrying only the OTP's SHA-256 hash, never the code itself, 10-minute expiry. Replaced an older flow that only checked a typed name+email matched the DB record — anyone who knew those two public-ish facts could have claimed someone else's account.

**Task visibility** — `visibility` column on `Task`. `ALL_ADMINS` (default) visible to all admins; `PRIVATE` visible only to creator. Filter: `OR: [{ createdById: user.id }, { visibility: 'ALL_ADMINS' }]`.

**Resource visibility** — `groupId` column on `Resource`. `null` = visible to every educator; set = visible only to `groupId`'s members. Educator-facing query: `OR: [{ groupId: null }, { groupId: { in: userGroupIds } }]`.

**Password auth** — bcrypt hashes (`lib/password.ts`, 10 salt rounds), never plaintext. `ensurePasswordColumns()` runs `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` inline on every auth request (memoised after first success) — a self-heal that sidesteps the chicken-and-egg problem of the full migrate route requiring an already-authenticated session. Generic `PUT /api/educators/[id]` explicitly strips `password`/`passwordSetAt` from the request body before it reaches Prisma, so password changes can only happen through the hashed set-password/reset-password paths.

**Per-programme certificates** — `GET /api/certificate?programId=X` checks `ProgramEnrollment` + every `Stage` under that `programId` has `StageProgress.passed = true` for the user. Omitting `programId` falls back to the legacy 5-stage track (`Stage.programId IS NULL`) for accounts that predate the multi-programme model. `POST /api/mcq/[stageId]` checks after every newly-passed attempt whether it completed the whole programme and, if so, fires a `Notification` (type `CERTIFICATE`) — that's the "auto-unlock".

**Google Sheets sync** — `lib/google-sheets.ts` exchanges `GOOGLE_REFRESH_TOKEN` for a short-lived access token on each call (plain `fetch`, no `googleapis` package) and talks to the Sheets API v4 REST endpoints directly. Chosen over a service-account key because many Google Workspace orgs enforce `iam.disableServiceAccountKeyCreation`. `POST /api/student-tests/[id]/attempt` fires a fire-and-forget `updateStudentRow()` call after grading, so a slow/failed Sheets write never blocks the student's test result.

**Cron jobs** — `vercel.json` schedules two: `GET /api/admin/cleanup` daily (`0 2 * * *`) and `GET /api/admin/weekly-digest` every Sunday (`30 12 * * 0`), both authenticated via `Authorization: Bearer ${CRON_SECRET}`. Cleanup deletes read notifications older than 30 days, unread notifications older than 90 days, and orphaned Vercel Blob files under the `resources/` prefix no longer referenced by any `Resource.url`. Both endpoints also accept an admin-session `POST` for a manual "Run Now"/"Send Now" from `/admin/settings`.

**One-time setup endpoints** (POST, admin-only):
- `POST /api/admin/seed-orientation-mcq` — seeds MCQ questions into Orientation Program stages
- `POST /api/admin/setup-stem-task` — creates STEM Educators group + July data task
- `POST /api/admin/setup-stem-resources` — seeds STEM Data, STEM Curriculum, STEM Materials, R&D 2026-27 resources
- `POST /api/admin/setup-north-south-resources` — seeds the North/South Campus weekly-meeting + SOP resources into the matching `EducatorGroup`
