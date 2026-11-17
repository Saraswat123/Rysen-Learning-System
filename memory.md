# Rysen AI working memory

Updated: 2026-11-17. This is a developer handoff, not model memory or a training dataset. Update facts and evidence after each merged stage; do not put credentials, student records, or conversation transcripts here.

## Verified current state

- LMS: Next.js 16, Prisma 7, PostgreSQL, Vercel. The checked-in AI calls use `groq-sdk` and default to `openai/gpt-oss-120b`.
- Active AI surfaces in the code: admin task agent, educator agent, student/learning insights, and task chat. They use authenticated LMS routes; the admin agent can currently write directly through tools.
- The repository has no durable AI conversation/run/approval tables, no live pgvector migration, and no production document ingestion or retrieval path.
- Existing LMS schema changes are listed in `lib/migrations.ts` and triggered from the admin migrate route after login; auth-critical columns self-heal in `lib/schema-heal.ts`. AI/pgvector rollout needs a separate reviewed, versioned deploy migration path for indexes and larger tables.
- `ml/evaluation/golden_tasks.json` has five synthetic cases. It is an evaluation seed, not an approved training corpus.
- Draft [PR #4](https://github.com/Saraswat123/Rysen-Learning-System/pull/4) contains the AI evaluation/RAG foundation and input/educator-scope fixes. Its foundation checks passed before this planning update; rerun and inspect checks for every new commit. This PR is not merged into production.
- On 2026-11-17, a no-key probe on the user's Mac returned JSON HTTP 401 from Groq and HTTP 200 from GitHub. This confirms network reachability. An unauthenticated 401 does not establish whether any credential works.
- A Groq key was exposed in chat and a shell command. Treat it as compromised. The owner must revoke it and create a fresh key; never copy it into this repository, command arguments, logs, or chat.

## Next gates

1. Owner revokes the exposed key, creates a fresh secret, and confirms Vercel development/preview/production secret placement. Run the live smoke test through hidden input only.
2. Merge a reviewed AI foundation after CI and a documented production behavior check.
3. Implement persistent AI threads, run state, idempotent tool execution, and human approval for writes before enabling autonomous LMS actions.
4. Select an approved document source, ACL mapping, embedding model/dimension and retention policy before a pgvector migration or ingestion.
5. Expand the golden dataset with reviewed, de-identified cases; measure quality, security, latency and cost before considering fine-tuning.

The older [LMS handover](HANDOVER.md), [architecture README](README.md) and [test inventory](TESTING.md) are source references; verify statements against current code before changing AI behavior. See [implementation plan](docs/ai/IMPLEMENTATION_PLAN.md), [database design](docs/ai/DATABASE_DESIGN.md), [model training decision](docs/ai/MODEL_TRAINING.md), and [existing dataset inventory](docs/AI_DATASET_INVENTORY.md).
