# Rysen AI implementation plan

Status: planned unless a step explicitly cites an implemented file or passing check. Keep the existing LMS and AI routes working while replacing direct agent execution in small releases.

## Target shape

```text
LMS UI -> authenticated AI API -> thread/run store -> policy + state machine
                                          |               |
                                          |          approved tool registry -> LMS DB
                                          |               |
                                          +-> retrieval -> ACL-filtered pgvector
                                          |
                                          +-> Groq model router -> response validator
                                                      |
                                               metrics + reviewed evals
```

The AI **thread** is a durable conversation and task context, not an operating-system thread. Use async I/O for API requests. A bounded worker queue handles ingestion and long agent jobs; concurrent reads may be parallelized only when they are independent and permission scoped. Writes are serialized per run and protected by idempotency keys.

## Stage 0 — credentials and baseline (first release gate)

- Revoke the exposed Groq key. Store a new key separately in local development and Vercel preview/production secrets; never put it in a sheet, Git, CLI argument or chat.
- Run a no-key connectivity probe, then a live model smoke test with the fresh key via hidden prompt. Record only model ID, HTTP outcome, request IDs, token counts and timing, never the key or student content.
- Freeze a baseline of the current admin/educator tool schemas, prompts, roles and five synthetic cases. Compare future changes against it.
- Add a route-level budget for requests, input history, tool steps and total wall time. Fail closed on unauthorized tool/data access.

Exit: key rotated, live Groq smoke succeeds, contract tests pass, and baseline report is stored without secrets.

## Stage 1 — sessions, decisions and human approval

- Create `AiThread`, `AiMessage`, `AiRun`, `AiToolInvocation`, `AiApproval` and `AiRunEvent` tables as designed in [DATABASE_DESIGN.md](DATABASE_DESIGN.md). The current LMS has login-triggered SQL in `lib/migrations.ts`; build a versioned deploy migration path for AI tables/indexes, then test it on a disposable local DB and staging before production.
- Add UI for multiple named threads per user. Persist only bounded recent messages plus a versioned summary; summaries are context compression, not model-weight updates.
- Implement the run states in `ai/state-machine.ts`. The server, not the model or client, owns state transitions and tool authorization.
- For v1, every LMS write becomes a proposed action with exact arguments shown to the authorized user. Approve/reject on the server, then execute once with an idempotency key. Read-only tools can execute without approval. Deletion and external reminders require explicit, separate approval.
- Verify the result from the LMS database after each write. Return a concise action receipt and safe error on failure.

Exit: concurrent thread isolation, cross-campus denial, replay-safe writes, approval/rejection, cancellation and crash recovery pass integration tests.

### Thread and action experience

| User intent | Agent behavior | Server boundary |
| --- | --- | --- |
| Start, rename, resume or archive a conversation | Keep a separate thread ID, recent turns and bounded summary | Session owner can access only own threads; archive/deletion follows retention policy |
| Navigate the LMS | Return a validated route suggestion with a UI label | Route allowlist; no fabricated URLs or privilege escalation |
| Ask for current task/test/student information | Select a read-only tool and cite its result time/scope | Recheck current role, branch and group permissions before each query |
| Create or change an LMS task | Prepare a typed proposal and explain impact | Display exact payload, require approval, execute idempotently, verify persisted result |
| Delete a task or send a reminder | Prepare a separate high-impact proposal | Explicit approval for that action, with expiry and audit receipt |
| Ask across threads or campuses | Keep contexts separate; explain access limits | Never mix summaries, tool results or cache entries across users/campuses |

An AI session should help users decide and navigate, while the server remains the source of truth for permissions and side effects. Multiple threads are logical contexts; they do not require one operating-system thread per user.

## Stage 2 — grounded documents and database data

- Keep live LMS facts behind deterministic, role/campus/group-scoped tools. Do not train on live student data to answer changing questions.
- Pilot one owner-approved document class. Extract PDF/DOCX/HTML in a worker, virus/size/type check, redact or reject sensitive text according to policy, chunk, embed with a selected/versioned model, and index in pgvector.
- Map source permissions to `AiDocumentGrant`; enforce ACL in SQL *before* ranking. Verify deletion/revocation removes inaccessible chunks. Cite source ID, title and location; abstain when evidence is missing.
- Compare vector retrieval with lexical/hybrid search first. Try GraphRAG only if a measured task class benefits and graph edges inherit source permissions.

Exit: source fidelity, stale-data handling, ACL attack cases and retrieval p95 meet agreed thresholds on staging data.

## Stage 3 — evaluation and post-training decision

- Grow reviewed golden cases across admin, educator, no-campus, read/write, prompt injection, malformed tool calls, stale data, grounded answers and abstention. Split by task/source to prevent evaluation leakage.
- Grade tool selection, argument correctness, task completion, citation support, unauthorized access, latency p50/p95, error rate and cost per completed task. Human reviewers adjudicate ambiguous answers and label failures.
- Improve prompts, tool schemas, retrieval and deterministic policy first. If a stable gap remains, create a consented, de-identified instruction dataset and hold out validation/test sets.
- **Pre-training** means training or adapting base-model representations on a large corpus; it is a separate, high-cost research decision with licensing, compute and privacy requirements. **Post-training** includes supervised fine-tuning/LoRA, preference tuning and distillation. No weight update is currently running.
- Use [MODEL_TRAINING.md](MODEL_TRAINING.md) for the decision tree and data gates.
- Groq hosts inference for the current model. Groq's current LoRA offer is enterprise-only inference for externally trained adapters on specifically supported base models; verify model support and account access before planning QLoRA deployment there. See [Groq LoRA documentation](https://console.groq.com/docs/lora).
- Human review and regression gates are required before any prompt, tool, retrieval or model promotion. Feedback may create candidate examples; it never changes production behavior automatically.

Exit: a candidate beats the baseline on held-out quality/security without violating latency or cost targets; otherwise retain the baseline.

## Stage 4 — deployment and measured scale

- Local: Docker Compose runs app dependencies, isolated Postgres/pgvector, migration checks, worker and contract/eval jobs. Never use a production database in local tests.
- CI: lint, types, unit/integration tests, secret scan, migration dry run, Docker build and synthetic evals. Opt-in live Groq tests use protected CI secrets and a fixed token budget.
- Staging: deploy behind a feature flag, load test with synthetic data, check rollback and data deletion. Canary by user/tenant cohort, with automatic stop on quality, unauthorized access, error rate or p95 regression.
- Production: keep the web app on Vercel initially. Add a queue/worker service only when ingestion or durable runs require it. Test a worker deployment locally with kind/Kubernetes before choosing production Kubernetes; avoid a second app platform without measured need.
- 100k registered users is not a throughput target. Capacity model = active users × AI turns/user × provider calls/turn, plus peak factor and token mix. Example only: 10k daily active × 2 turns × 2 provider calls = 40k calls/day before peak. Validate actual Groq organization RPM/TPM/RPD limits and obtain capacity before a large launch; see [Groq rate limits](https://console.groq.com/docs/rate-limits).
- As checked on 2026-11-17, Groq's published base Developer-plan table shows `openai/gpt-oss-120b` at 30 RPM, 1,000 RPD and 8,000 TPM, with possible account-specific limits. The illustrative 40k calls/day is far beyond that base RPD; scaling the app or adding threads cannot remove the provider limit. Obtain the actual organization limits and an agreed capacity plan first.
- Load test DB connection pooling, queue depth, worker concurrency, model 429 handling, circuit breaker, cache hit rate and p95 end-to-end latency. Autoscale workers from queue lag; bound per-user and per-organization concurrency.

Exit: defined load profile, error budget, canary criteria, rollback drill and production smoke checks all pass. Do not claim support for 100k users until measured against the agreed active-user scenario.

## Immediate implementation order

1. Rotate key and complete live smoke.
2. Review/merge AI foundation PR.
3. Build thread/approval DB migration and API/UI in staging.
4. Pilot a single approved RAG source.
5. Expand evals and decide whether post-training is justified.
6. Load test and deploy in cohorts.
