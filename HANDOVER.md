# Rysen Learning Centre — handover

Full architecture and feature reference lives in `README.md`; test coverage in
`TESTING.md`. This document is the "pick this up cold" summary.

## What it does

Runs the day-to-day operations for RYSEN's network of schools from one app:
admins manage 15+ campuses, educators and principals complete onboarding/MCQ
training and get e-certificates, students take tests and see a leaderboard,
and attendance/progress data syncs live into a Google Sheet admins already
use. It replaces what was previously tracked across WhatsApp, spreadsheets,
and in-person check-ins.

## How to run it

```bash
node -v      # need 20+, repo built/tested on Node 22
npm ci
npx prisma generate
npm run dev  # http://localhost:3000
```

No local `.env` is required to build, typecheck, or run the test suite — those
never touch the database. To run against real data you need a `.env.local`
with at minimum `DATABASE_URL` (Neon Postgres) and `AUTH_TOKEN_SECRET`; the
full list with what each one gates is in `README.md` → Environment Variables.
Secrets live in Vercel's Production/Preview env vars, not in this repo, not in
chat history — rotate anything you find pasted in a conversation.

**Non-obvious setup step:** on a brand-new database, nobody has to run a
migration tool by hand. The first admin login triggers
`POST /api/admin/migrate` from `app/admin/layout.tsx` (once per browser
session, gated by a `sessionStorage` key you bump — `rysen_migrated_vNN` — any
time you add an entry to `lib/migrations.ts`). Auth-critical columns
(`User.password`, `Student.pinHash`, the `RateLimit` table) self-heal even
earlier, inside `lib/schema-heal.ts`, so login works before any admin has
logged in post-deploy to trigger the full migration list.

## How to tell it worked

```bash
npm test          # 76 tests, all green, ~12s
npm run build     # must say "Compiled successfully"
```

For a live deploy: log in as admin at `/admin/login`, open Settings → the
migration banner should say "up to date" (if it instead lists pending
migrations, that's expected right after a schema change — it ran
automatically on this login). Then: a student can log in at `/student/login`
with just name + class (or + PIN if an educator set one), submit a test, and
immediately see their score. That round trip — login → submit → score — is
the single signal that the DB connection, session cookies, and grading logic
all actually work together; a passing `npm test` alone doesn't prove the real
Neon connection or cookie flags work in production.

## What breaks first

**Google Sheets sync silently does nothing if the 4 OAuth env vars
(`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REFRESH_TOKEN`/
`GOOGLE_SHEETS_ID`) aren't all set** — `sheetsEnabled()` just returns false and
every sync call is skipped, with no error surfaced to the end user beyond the
admin Students page's own banner. If "Sync to Sheet" looks like it did
nothing, check those four vars in Vercel first, not the code.

Second most likely: the refresh token can expire or be revoked (e.g. if the
Google account's security settings change). The symptom is every Sheets call
failing with `Google token error: invalid_grant` in Vercel's function logs.
Fix is a new one-time OAuth consent flow — the script that produced the
original token isn't checked in; regenerate using Google's OAuth playground
or a short script with the same `client_secret.json`.

## What is NOT built

- No real browser/E2E tests (Playwright etc.) — `TESTING.md` lists exactly
  what's covered vs. what needs manual clicking before a release.
- No load testing. The one-attempt-per-test and MCQ-attempt-cap locks use
  Postgres advisory locks, which are correct under real concurrent
  connections but untested under real concurrent load.
- No email-delivery or Groq-AI-call testing — those are mocked out everywhere.
- No multi-region deploy; Vercel is pinned to `iad1` (US East) regardless of
  where campuses actually are, which adds latency for users in India.
- No admin UI for Vercel Cron failures — if `app/api/admin/cleanup` or
  `weekly-digest` fails, you find out from Vercel's own cron logs, not from
  inside the app.
- No automated secret rotation or credential vault — anything in Vercel env
  vars is managed by hand.

## Who owns it

Code and this handover live in `github.com/Saraswat123/Rysen-Learning-System`,
`main` branch, deployed on Vercel. Runbook for day-to-day issues is
`README.md` (architecture) + `TESTING.md` (what's verified). No named
maintainer beyond the project owner is recorded in the repo as of this
handover (2026-11-10) — add one here the next time ownership changes.
