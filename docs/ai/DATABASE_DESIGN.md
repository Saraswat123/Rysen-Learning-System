# Rysen AI database design (proposal, no migration applied)

Use the existing PostgreSQL database for session/action metadata. Keep provider credentials in deployment secrets. Keep raw attachments in approved object storage; database rows hold references, checksums, grants and derived chunks. The current `ml/rag/schema.sql` is an experimental contract, not a production migration.

| Table | Key columns | Purpose / constraints |
| --- | --- | --- |
| `AiThread` | `id`, `ownerUserId`, `branchId`, `title`, `summary`, `summaryVersion`, `createdAt`, `updatedAt`, `deletedAt` | Owner-scoped conversation. Index `(ownerUserId, updatedAt)`; branch snapshot is advisory and rechecked against current user permissions. |
| `AiMessage` | `id`, `threadId`, `role`, `contentRef`, `contentDigest`, `tokenCount`, `createdAt` | Ordered turns. Minimize retained raw text; encrypt/restrict content storage and delete with thread. Reject caller-supplied system/tool roles. |
| `AiRun` | `id`, `threadId`, `requesterUserId`, `state`, `modelVersion`, `promptVersion`, `toolVersion`, `idempotencyKey`, `startedAt`, `finishedAt`, `errorCode` | One user turn and its execution. Unique `(requesterUserId, idempotencyKey)`; index `(state, startedAt)` for recovery. |
| `AiRunEvent` | `id`, `runId`, `sequence`, `fromState`, `toState`, `actorType`, `actorId`, `at` | Immutable transition audit. Unique `(runId, sequence)`; no secret or raw payload. |
| `AiToolInvocation` | `id`, `runId`, `step`, `toolName`, `argumentsDigest`, `resultDigest`, `status`, `idempotencyKey`, `startedAt`, `finishedAt` | Bounded, typed tool execution and replay protection. Store approved arguments in protected storage if needed for review. |
| `AiApproval` | `id`, `runId`, `toolInvocationId`, `requesterUserId`, `approverUserId`, `decision`, `payloadDigest`, `expiresAt`, `decidedAt` | Exact proposed action reviewed by an authorized human. Approver may not be the model; reject stale or changed payload. |
| `AiDocument` | `id`, `sourceType`, `sourceId`, `sourceVersion`, `contentSha256`, `embeddingModel`, `status`, `createdAt`, `deletedAt` | One ingested source version. Unique `(sourceType, sourceId, sourceVersion, embeddingModel)`. |
| `AiDocumentGrant` | `documentId`, `principalType`, `principalId`, `permission` | Role, campus, group or explicit-user grants mapped from source ACL; never inferred by the LLM. |
| `AiChunk` | `documentId`, `ordinal`, `textRef`, `sourceLocator`, `embedding` | pgvector dimension chosen only after embedding model selection. Index vector and document; source ID/ordinal retained for citations. |
| `AiFeedback` / `AiEvalRun` | `runId`, `label`, `reviewerId`, `datasetVersion`, `graderVersion`, `scores`, `createdAt` | Reviewed feedback and reproducible evals; training export requires separate approval and de-identification. |

## Data and access rules

- Authorize a thread by current session `userId` on every read/write. Never trust `ownerUserId`, `branchId`, role or tool arguments from the model/client.
- Query document grants and source publication/deletion status in the database before vector ranking. Recheck source permissions at answer time, including after an ACL change.
- Use transactions or an outbox for run transition + tool intent. A retry may re-read or resume; it must not repeat a task creation, deletion, assignment or reminder.
- Retention, encryption and deletion periods need owner policy before applying the migration. Database backups and embeddings must follow the same deletion/retention decision.
- Store metrics (latency, tokens, error code) without raw student content. Keep audit visibility limited to authorized operators.
- Migrate on staging first. Existing Prisma schema has no AI thread tables, so no production data migration has been run for this design.
