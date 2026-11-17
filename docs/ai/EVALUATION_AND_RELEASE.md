# Rysen AI evaluation and release gates

## Dataset and grading

Start with `ml/evaluation/golden_tasks.json` as a synthetic seed. Each new case needs an owner, dataset version, agent role, campus/group context, input, allowed tools, forbidden data/actions, expected evidence and human-reviewed outcome. Keep training, prompt-development and final test partitions separate by source and task. Real LMS records require explicit approval and de-identification before reuse.

| Measure | Grading method | Release rule |
| --- | --- | --- |
| Unauthorized data or action | Deterministic cross-role/campus/group assertions and human security review | Zero observed failures; any failure blocks promotion |
| Write without approval or duplicate execution | Integration tests with retries and concurrent requests | Zero observed failures; any failure blocks promotion |
| Tool choice and arguments | Exact/semantic comparison to reviewed task rubric | Improve against the frozen baseline; threshold set after baseline run |
| Task completion and grounded answer | Human review plus citation/source checks | No unsupported live LMS numbers; threshold set after baseline run |
| Abstention on missing evidence | Adversarial and stale-source cases | No fabricated facts in release set |
| p50/p95 latency and error rate | Warmed, representative traffic at specified concurrency | Limits agreed before canary; report sample count and failures |
| Cost | Input/output/tool tokens and model calls per completed task | Budget agreed before canary |

An LLM grader may triage answers but cannot be the sole judge for privacy, permissions, side effects or final promotion. Record disagreement and have a human adjudicate. Return concise reasoning summaries; do not collect or expose hidden chain-of-thought.

## Test layers

1. **Local unit/contract:** state transitions, approval binding, schemas, chunking, redaction, tool argument validation and model routing.
2. **Disposable DB integration:** migrations, owner/campus/group ACL, two concurrent threads, retries, queue resume, document revocation and idempotent writes.
3. **Docker Compose:** app/worker/Postgres/pgvector with synthetic fixtures; health checks and crash recovery.
4. **Live Groq staging:** fresh secret through protected settings, fixed small token budget, model availability, actual tool calls, grounded answer and response timings. Never use the exposed key.
5. **Local Kubernetes (kind):** worker deployment, readiness/liveness, secret injection, horizontal scaling from queue lag, rolling restart and rollback. Do this after a worker exists.
6. **Production canary:** feature flag by authorized cohort; monitor p95, 429s, cost, failures, approval/ACL violations and user feedback. Roll back on a security failure immediately.

## Evidence bundle for each release

Record commit, model/prompt/tool/dataset versions, migration ID, environment, synthetic and live test summaries, sample counts, latency distribution, cost estimate, canary cohort, rollback command and human sign-off. Do not include API keys, raw student records or hidden reasoning traces.
