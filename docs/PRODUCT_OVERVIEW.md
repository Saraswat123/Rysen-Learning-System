# What is Rysen Learning Centre?

One page, two readings: skip to **For everyone** if you just want to know what
the product does. Skip to **For engineers** if you want the one-paragraph
technical summary before diving into `TECH_STACK.md` / `HLD.md` / `LLD.md`.

## For everyone

RYSEN Group of Schools runs 15 campuses and 50+ teachers. Before this system,
that meant tracking who'd finished their training, who needed a password
reset, which student passed which test, and who's owed a certificate — across
WhatsApp groups, spreadsheets, and in-person check-ins. Rysen Learning Centre
replaces all of that with one web app, with a different view for each kind of
person who uses it:

- **A student** logs in with their name and class (a teacher can also set
  them a short PIN), takes a timed multiple-choice test, and sees their score
  immediately. A leaderboard shows how their class is doing.
- **A teacher (educator)** completes their own onboarding training, creates
  tests for their students, tracks who's falling behind, chats with other
  teachers in their group, and gets assigned tasks by the office with
  deadlines and a comment thread.
- **A campus head (principal)** sees how their own campus's teachers are
  progressing through training, and does the same training themselves.
- **An admin** (head office) manages every campus, every teacher, every
  student, every test, and every task from one dashboard — including a
  monthly "star rating" recognition program and a live Google Sheet that
  always shows the current roster and test results without anyone
  copy-pasting anything.

**The one feature that saves the most time:** a teacher or student finishing
a stage of training or a programme gets their certificate the moment they
pass — no admin has to notice, generate it, or send it. The system notices.

**What it is not:** it doesn't teach the material itself (that still happens
in the classroom); it tracks who finished what, grades objective tests, and
moves information so nobody has to chase it by hand.

## For engineers

A Next.js 16 (App Router) app on Vercel, with Prisma 7 over a pooled
connection to Neon serverless Postgres; four role-scoped portals (admin,
educator, principal, student) share one API surface under `app/api/`, backed
by cookie sessions with no JWT (every request hits the `Session` table).
Email (Brevo/Resend), WhatsApp (Twilio), file storage (Vercel Blob), AI
(Groq), and a live Google Sheet (OAuth2, no service account) are the external
integrations; two Vercel Cron jobs do the only scheduled work. Full detail in
`TECH_STACK.md`, `HLD.md`, and `LLD.md`; role-by-role click paths in
`USER_FLOWS.md`.

## Who reads what

| Document         | For                                                           | What it answers                                                                       |
| ---------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| This file        | Anyone                                                        | What does this product do, in plain language?                                         |
| `TECH_STACK.md`  | Engineers, technical reviewers                                | What's it built with, and why that choice?                                            |
| `HLD.md`         | Engineers, architects                                         | What are the big pieces and how do they talk to each other?                           |
| `LLD.md`         | Engineers building/reviewing the code                         | How does a specific feature actually work, down to the data model and the auth check? |
| `USER_FLOWS.md`  | Product people, QA, new teammates, non-technical stakeholders | What does a student/teacher/admin actually click through?                             |
| `../TESTING.md`  | Engineers                                                     | What's covered by automated tests, what still needs a manual check?                   |
| `../HANDOVER.md` | Whoever inherits this                                         | How do I run it, and what breaks first?                                               |
