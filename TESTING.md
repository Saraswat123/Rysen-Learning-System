# Testing — Rysen Learning Centre

This covers the automated suite added 2026-11-10 (76 tests, 8 files) and the manual
checks that still have to be done by hand because they need a real browser or a
real Google Sheet. Read this before trusting a green build, and before adding a
new route or page — most new work should add a test in the matching layer below.

## Run it

```bash
npm test              # one run, CI mode
npm run test:watch    # re-runs on file change
```

No `.env` needed. The database tests spin up a throwaway Postgres in-process
(`@electric-sql/pglite`) and apply the real Prisma schema to it — nothing touches
Neon. The API tests mock Prisma entirely (`tests/api/harness.ts`). Nothing in this
suite makes a network call, sends an email, or hits Google Sheets for real.

## Layers, bottom to top

### 1. Database — `tests/db/`

Real SQL against a real (ephemeral) Postgres, not mocks. This is the layer that
catches schema and migration bugs the other two layers can't see, because they
never run actual SQL.

- `tests/db/global-setup.ts` runs `prisma migrate diff --from-empty` once per test
  run and hands every test the exact DDL Prisma would generate for
  `prisma/schema.prisma`.
- `tests/db/pg.ts` — `freshDatabase()` applies that DDL to a new PGlite instance;
  helpers (`insertBranch`, `insertUser`, `insertStudent`, `insertTest`, `id()`)
  build minimal rows.
- `schema-and-migrations.test.ts` — the schema applies cleanly; every entry in
  `lib/migrations.ts` runs without error and is idempotent (running the list twice
  leaves nothing pending); all 14 indexes get created; the EducatorRating
  legacy-drop migration only fires when the legacy `kra1` column is actually
  present (this was the bug that wiped ratings every admin session — see
  `d1e753c`).
- `integrity.test.ts` — the rate-limit SQL counts correctly and resets per window;
  cascade deletes work (deleting a student removes their attempts and sessions;
  deleting an educator removes their sessions and progress); unique constraints
  hold.

**When to add here:** you change `prisma/schema.prisma`, add an entry to
`lib/migrations.ts`, or add a raw SQL statement anywhere (`$executeRaw`,
`$queryRaw`). If you can't picture the exact row a migration should produce,
this layer will show you.

### 2. API routes — `tests/api/`

Each test imports the real route handler from `app/api/.../route.ts` and calls it
directly with a `NextRequest` — no HTTP server, no browser. `tests/api/harness.ts`
replaces `@/lib/db` with a Proxy that hands out `vi.fn()` Prisma methods per model,
so a test asserts on the exact `where`/`data` a route sent to the database instead
of needing a real one.

- `admin-security.test.ts` — the admin/privilege-escalation regressions: an ADMIN
  can't promote themselves via `PUT /api/educators/[id]`, can't touch a
  SUPER_ADMIN account through the educator route, the seed-MCQ endpoint requires
  a session, the stage answer key is hidden from non-admins, cron routes refuse
  an empty `CRON_SECRET`.
- `student-flows.test.ts` — student PIN login (same error for "no such student"
  and "wrong PIN"), rate limiting, test-attempt gating (published/campus/window),
  the one-attempt cap, that correct answers never reach a student before they
  submit.
- `staff-auth-and-scoping.test.ts` — educator/admin/principal login give identical
  responses for unknown account vs wrong password (no enumeration), campus
  mismatch is checked only after the password, the setup-OTP guess cap, and
  educator campus scoping (can't edit another campus's test, can't move a
  student to another campus, sees nothing with no campus assigned).

**When to add here:** you add or change a route handler, especially anything
touching a role check, an id ownership check, or a rate limit. If you can
describe the bug as "user X could do Y to record Z", this is where the test
goes — mock the Prisma call that would prove X did or didn't happen.

### 3. Unit — `tests/unit/`

Pure functions and small modules, no mocking needed.

- `access-rules.test.ts` — every access-decision helper in `lib/` tested directly
  against its own truth table: `studentTestBlock`, `isAnswerMap`,
  `canAccessBranchRecord`, `educatorBranchListWhere`, `countedStageWhere`,
  `isStageForRole`, `educatorCanAccessStudent`, `educatorStudentWhere`.
- `otp-and-email.test.ts` — the setup-OTP token survives round-trip verification,
  rejects a wrong code, rejects a tampered/re-signed token, and (the regression
  this exists for) its JWT payload can no longer be brute-forced offline the way
  the old plain-`sha256(otp)` version could; `escapeHtml` neutralises HTML in
  user-entered names before they reach an email template.
- `google-sheets.test.ts` — against a stubbed `fetch`: headers have exactly as
  many columns as a data row (the old off-by-one); a sync writes the new rows
  before clearing the leftover tail, so a failed write can't empty the sheet; a
  failed write throws instead of reporting success; per-attempt updates match by
  student id, not by the first same-name/same-campus row.

**When to add here:** a pure function in `lib/` with no DB and no network. If it
needs `vi.fn()` on more than one or two things, it probably belongs in `tests/api/`
instead.

## What this suite does NOT cover (do these by hand)

- **Any real browser flow.** No Playwright/Cypress yet. Before a release, click
  through at least: student login + PIN, submit a test, educator login +
  password setup, admin bulk delete, mobile menu on a phone-width viewport.
- **Google Sheets against the real API.** The unit tests stub `fetch`; they prove
  the _shape_ of the requests is right, not that Google accepts them. After
  touching `lib/google-sheets.ts`, click "Sync to Sheet" in the admin Students
  page against the real sheet once.
- **Email delivery** (Brevo/Resend) and **Groq AI calls** — not exercised at all.
- **Vercel Cron** — the auth check is unit-tested; the actual scheduled
  invocation is not. Check Vercel's cron logs after a deploy that touches
  `app/api/admin/cleanup` or `weekly-digest`.
- **Load/concurrency** — the one-attempt-per-test and MCQ-attempt-cap locks use
  Postgres advisory locks (`pg_advisory_xact_lock`); PGlite accepts the call but
  doesn't model real concurrent transactions, so a genuine race-condition test
  would need a real Postgres with two connections. Not done here.

## CI

`.github/workflows/ci.yml` runs on every push and PR: install, `prisma generate`,
`npm run lint`, `tsc --noEmit`, `npm test`, `npm run build`. A red check on a PR
means one of those failed — read the job output, don't just re-run it.
