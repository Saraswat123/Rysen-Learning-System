# Rysen AI runtime modules

`state-machine.ts` is a tested contract for the proposed durable run lifecycle and approval policy. It is **not wired into current API routes**. Existing agents still execute their present tools directly; [Stage 1](../docs/ai/IMPLEMENTATION_PLAN.md) replaces that path with persistent threads, server-checked approvals, idempotent execution and result verification.

The current evaluation and RAG experiments remain in `ml/`. Do not move them or enable production retrieval until source ACLs, embedding model and migration are reviewed.
