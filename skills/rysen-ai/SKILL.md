---
name: rysen-ai
description: Implement or review Rysen Learning Centre AI agents, sessions, document retrieval, evaluations, model changes, and staged deployments in this repository.
---

# Rysen AI work

Read the repository's `memory.md` for verified state, then the relevant section of `docs/ai/IMPLEMENTATION_PLAN.md`. Use `docs/ai/DATABASE_DESIGN.md` for session/RAG schema work and `docs/ai/EVALUATION_AND_RELEASE.md` for quality or deployment work. Inspect actual code before asserting a feature is active.

- Keep live LMS facts behind authenticated, role/campus/group-scoped tools. Do not use model-generated SQL or train on live student data by default.
- Treat a thread as persisted user context and a run as one bounded execution. The server owns state, tool authorization, approval checks and idempotency. Current `ai/state-machine.ts` is a contract, not integrated enforcement.
- For LMS writes, show the exact proposed payload to an authorized human and verify approval for that payload before executing. Make retries replay-safe; verify the database result. Unknown tools fail closed.
- Keep prompt, model, tool, embedding and dataset versions with evaluation evidence. Use human review for ambiguous quality decisions and all security-sensitive release decisions.
- Keep credentials out of Git, chat, shell arguments, logs and `memory.md`. The previously exposed Groq key must be revoked; live tests use a fresh secret through a hidden prompt or protected deployment settings.
- Distinguish implemented behavior from design. Update `memory.md` only after verifying changed code, tests, deployment and merge status.

The user may authorize a particular action in the current conversation; this skill does not add a separate approval requirement for that action. Deployment and production mutations follow the user's actual authorization.
