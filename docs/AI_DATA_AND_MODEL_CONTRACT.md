# Rysen AI — data, metadata and model contract

## Live data boundary

Rysen AI receives live LMS information only through authenticated application tools.

```
user session -> role/campus scope -> Prisma query -> minimal tool result -> model
```

The model must not receive:

- DATABASE_URL
- provider API keys
- session secrets
- unrestricted SQL
- full database tables
- another user's private records
- unredacted personal data for training

## Metadata filter contract

Every live-data tool should make its scope explicit:

- userId: derived from the authenticated session, never model-supplied
- role: derived from the authenticated session
- branchId: derived from the authenticated session or an admin-approved scope
- ownership/assignment: enforced in application code
- requested fields: allowlisted
- row limit: bounded
- sort/order: allowlisted
- audit event: recorded for mutations and sensitive reads

Tool arguments can request a task ID, test title or date range, but cannot widen authorization.

## Training data pipeline

Training examples must be generated from approved, redacted snapshots:

1. export only the fields required for the task
2. remove names, emails, phone numbers, IDs and free-text secrets
3. replace records with stable synthetic identifiers
4. record dataset version and schema version
5. split train/validation/test by task and time to avoid leakage
6. review examples before model training
7. delete temporary raw exports after the retention period

Live production DB rows are not a training dataset by default.

## Model release tuple

A release is the combination of:

- model/provider identifier
- base model revision
- adapter revision, if any
- tokenizer revision
- prompt version
- tool-schema version
- application commit
- evaluation-set version
- configuration version

A release is not promotable if any component is unknown.

## Observability fields

For each AI request, capture safe metadata:

- request ID
- agent name
- user role and branch scope, not raw sensitive content
- model/provider
- prompt version
- tool-schema version
- model turns and tool calls
- input/output token counts when available
- latency by model/tool stage
- retry and fallback reason
- outcome class
- evaluation label where applicable

Do not log secrets, raw tokens, full sensitive prompts or unredacted tool payloads.
