# Rysen Learning System — security and full-stack test plan

**Branch:** `security/full-stack-test-plan`  
**Scope:** authorized testing of this application in a local or isolated staging environment. This document is a test plan; cases marked planned have not been executed or passed.

The LMS processes student records, educator/admin accounts, test answers, uploaded learning materials, AI requests, and campus-level reporting. Test tenant isolation and server-side authorization first. Use synthetic accounts and records only. Do not run destructive, high-volume, or exploit tests against the public production site without an approved window and a tested recovery plan.

## Test setup and safety

1. Use a disposable database populated with synthetic data for two campuses, an admin, a principal, educators in each campus, and students in each campus. Create private/public resources, assigned/unassigned tasks, and draft/published/scheduled/expired tests.
2. Configure test-only auth secrets, email sink, fake or mocked Groq, Blob, Sheets, and Turnstile integrations. Assert tests make no calls to real students, providers, or production data.
3. Save the starting database state and reset it between cases. For destructive tests, verify the test ID/tenant is disposable before running.
4. Record route, role, campus, test data, expected and actual status, response shape, database side effects, trace/request ID, and a sanitized artifact. Never store real tokens, student data, or secrets in a test report.
5. Start with unit/integration tests, then browser E2E and dependency/static scans. Run manual proxy and runtime checks only against the isolated staging URL.

## Existing automated coverage

The repository already has Vitest suites under `tests/api`, `tests/db`, and `tests/unit`. They cover useful baseline cases, including generic login errors, rate limits, password setup OTPs, branch scoping, test-answer secrecy, one-attempt rules, admin route protections, cron secret checks, and database integrity. Keep these tests as regression coverage. They do not by themselves establish that all routes or deployment controls are secure.

Run the current suite locally with:

```sh
npm test
```

The configured Vitest global setup uses PGlite; see `vitest.config.mts` and `tests/db/global-setup.ts`. Confirm required environment values are test-only before running. The repo currently has no Playwright config in the root; establish staging-only browser E2E setup before adopting the browser cases below.

## Prioritized test cases

Status for every case in this table: **planned** until an execution record is added below.

| ID | Priority | Type | Test and expected result |
| --- | --- | --- | --- |
| AUTH-01 | P0 | API + DB | Request every protected API without a cookie, with a random token, expired token, deleted session, inactive account, and wrong-role session. Return the documented 401/403 behavior; protected reads/writes cause no data change. |
| AUTH-02 | P0 | API + browser | Inspect staff and student login cookies over HTTPS: `HttpOnly`, `Secure`, appropriate `SameSite`, path, and expiry. Logout invalidates the DB session and browser cookie; replaying the old cookie fails. Verify CSRF defenses for cookie-authenticated state changes. |
| AUTH-03 | P0 | API + DB | Exercise admin, super-admin, principal, educator, and student matrices for each route family. Role changes, account deactivation and password reset must revoke or revalidate existing sessions according to policy. |
| TENANT-01 | P0 | API + DB | Create Campus A and Campus B records. From A, guess B IDs on student, test, progress, assignment, resource, group, recognition, certificate, and export endpoints. Return no B data and make no B mutation. Repeat in the reverse direction. |
| TENANT-02 | P0 | API | Probe null/missing branch IDs, all-campus rows, legacy rows, group membership changes, and cross-branch bulk IDs. Ensure empty scope never becomes an unfiltered query and bulk operations reject mixed-tenant batches atomically. |
| STUDENT-01 | P0 | API + browser | A student must not read another student's profile, attempt, result, session, or private progress; reject unpublished, wrong-campus, not-yet-open, expired, and already-attempted tests. Verify correct IDs, answers, explanations, and PIN hashes are not sent before policy permits them. |
| STUDENT-02 | P1 | API + DB | Submit unknown question IDs, omitted and duplicate answers, oversized answer maps, malformed JSON, unexpected answer types, and concurrent duplicate attempts. Reject invalid input; enforce one attempt under race; grading and stored score agree. |
| INPUT-01 | P0 | API + DB | For JSON, query, route IDs, uploads, CSV/XLS imports, comments, task names, and resource URLs, test malformed/oversized input, SQL/ORM operator objects, HTML/script payloads, formula cells, path traversal, Unicode confusables and control characters. Reject or safely encode; no unexpected query/write or stored/reflected XSS. |
| UPLOAD-01 | P0 | API + storage | Test unauthenticated, non-admin and admin upload paths. Try spoofed MIME, double extensions, mixed-case dangerous suffixes, SVG/HTML/XML/script, empty file, traversal filename, and size boundaries around 50 MB. Denied uploads never reach Blob; accepted objects use safe names and intended access. |
| UPLOAD-02 | P1 | API + browser | Test student-test content and avatar upload paths separately: authorization, campus ownership, MIME/content validation, size limits, overwrite/delete permissions, and that public URLs do not expose private records. Malware scanning/content-disposition expectations must be made explicit. |
| AI-01 | P0 | API + mocked provider | Unauthenticated callers cannot invoke AI routes. Educator agent tools cannot accept caller-supplied user/campus scope; prompt-injection requests for another campus remain scoped to the signed-in educator. Verify every tool's authorization at execution time, not just in prompt text. |
| AI-02 | P0 | API + mocked provider | Have the model emit unknown tool names, invalid JSON, extra/privileged fields, repeated destructive tool calls, huge arguments, and tool calls after a timeout. Allow only the declared schema and intended role permissions; bound iterations/tokens/time; audit side effects. |
| AI-03 | P1 | integration | Simulate Groq timeout, 429, 5xx, malformed response and leaked-secret text. User responses must not expose keys, prompts, internal stack traces, or cross-user data; retries are bounded and costs do not multiply without limit. |
| RATE-01 | P0 | API + DB | Verify IP and identity limits for staff login, student login, OTP request and password setup across the configured window, including concurrent requests and proxy headers. Untrusted forwarded-IP headers must not bypass limits. Confirm 429 response and reset behavior. |
| OTP-01 | P0 | API | Test expired, replayed, modified, wrong-account, wrong-email and brute-forced OTP/setup tokens; verify generic response behavior prevents account enumeration and success consumes the one-time code. Check signing-key rotation/missing-key fail-closed behavior. |
| CRON-01 | P0 | API | Call cron endpoints with missing, empty, malformed, wrong and correct secrets. No unauthorized request performs cleanup, sends email, or modifies records. The secret must not appear in response or logs. |
| CSRF-01 | P0 | browser + proxy | From a different origin, attempt cookie-authenticated POST/PUT/DELETE and multipart requests. Verify Origin/SameSite/CSRF controls block state changes; GET requests never mutate state. Include login CSRF and logout behavior. |
| XSS-01 | P0 | browser | Store harmless `<img onerror=...>` and SVG-style sentinel strings in names, tasks, comments, resources and AI output. Verify React rendering escapes content and no script executes in staff, principal, educator, or student views. Test PDF/CSV exports as a separate sink. |
| HEAD-01 | P1 | staging proxy | Inspect HTTPS, HSTS, CSP, frame protection, MIME sniffing, referrer and permissions policies, cache rules for authenticated responses, and CORS. `next.config.ts` currently contains no explicit headers; establish the intended policy, then assert it in a deployed-header check. |
| DB-01 | P0 | DB integration | Attempt duplicate enrollment, repeated attempt, conflicting progress and concurrent update operations. Verify unique constraints, transactions, foreign keys and tenant predicates prevent inconsistent or cross-tenant state. Review migrations for unsafe defaults/data exposure. |
| DB-02 | P1 | DB + ops | Confirm production DB uses TLS, least-privilege credentials, backups and a tested restore path. Verify logs/exports do not contain credentials or unnecessary student PII. These checks require deployment-owner evidence; they are not inferable from unit tests. |
| E2E-01 | P1 | Playwright | Full flow: admin creates educator/student and published material → educator sees only campus records → student signs in and submits one test → educator/admin see the correct scoped result. Assert authorization failures as well as happy paths and DB side effects. |
| E2E-02 | P1 | Playwright | Exercise password setup, logout/session replay, branch switching, concurrent test submission, file upload rejection, and an AI tool-call response with provider mocked. Run only against disposable staging. |
| DEP-01 | P1 | CI/static | Run secret scanning (e.g. Gitleaks), dependency audit, Semgrep/CodeQL, TypeScript/lint, and migration review. Triage findings; do not treat a clean scanner result as proof of security. Review Git history for revoked secrets if any are discovered. |
| PERF-01 | P2 | staging load | With synthetic records, gradually test login, dashboards, test submit and read-only AI flows at agreed concurrency. Track p50/p95, errors, DB pool pressure and provider spend. Set stop thresholds; no production stress testing. |

## Code and deployment areas to examine

- Auth and session handling: `lib/auth.ts`, `lib/student-auth.ts`, `lib/staff-login.ts`, `lib/student-login.ts`, `lib/account-setup-otp.ts`, login/logout and OTP routes.
- Authorization and tenant boundaries: `lib/branch-scope.ts`, `lib/task-access.ts`, student/test/resource/task/group/recognition API routes, and every bulk/export route.
- Upload/public storage: `app/api/resources/upload/route.ts`, `app/api/auth/avatar/route.ts`, `app/api/student-tests/[id]/content/upload/route.ts`, Blob lifecycle/cleanup, and download/render paths.
- AI boundary: `app/api/ai/task-agent/route.ts`, `app/api/ai/educator-agent/route.ts`, tool execution functions and data queries. Treat model text as untrusted input; authorization must be enforced in code.
- Deployment: `next.config.ts`, Vercel settings, environment variables, database TLS/roles/backups, provider keys, cron configuration and logs. These require configuration access and are not verified by this repository review.
- Tests to extend: `tests/api/admin-security.test.ts`, `tests/api/staff-auth-and-scoping.test.ts`, `tests/api/student-flows.test.ts`, `tests/db/integrity.test.ts`, plus isolated upload and AI route suites.

## Suggested execution order

1. **P0 automated regression:** add/extend Vitest API and DB tests for authorization matrix, tenant IDOR, upload validation, CSRF assumptions, and AI tool enforcement using mocks and disposable data.
2. **P0 staging manual:** session/cookie and header inspection; cross-campus attempts; upload edge cases; auth/rate-limit/cron abuse with low request volume.
3. **P1 full-stack:** add Playwright config for an isolated staging deployment and run the two end-to-end flows above.
4. **P1 code and supply chain:** secret scan, dependency review, static analysis, manual review of every API route and migration. Fix and retest by severity.
5. **P2 resilience:** controlled concurrency, provider failure simulation, backup restore evidence, and monitoring/alert review.

Do not automate destructive security probes against production. For each confirmed issue, capture a minimal sanitized reproduction, impact, affected roles/tenants, evidence, severity rationale, remediation owner, and retest result. Keep credentials and student identifiers out of the report.

## Execution log

No security scan or live exploit test has been performed as part of creating this plan. Add dated, environment-labeled results here after authorized testing; record failures and limitations rather than marking a category complete from code inspection alone.
