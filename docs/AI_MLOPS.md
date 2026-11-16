# Rysen AI — model, evaluation and MLOps foundation

Status: foundation design and local contract validation. This document does not claim that a fine-tuned model, Kubernetes production serving, or canary deployment is already live.

## Current production path

Rysen currently uses Groq as the inference provider with `openai/gpt-oss-120b`. The Admin and Educator agents call application tools; the model does not receive direct database credentials or unrestricted database access.

```
browser
  -> Next.js serverless API route
  -> authenticated role/campus checks
  -> Groq chat completion + tool schemas
  -> application tool execution against Prisma/Postgres
  -> compact tool result
  -> model response
```

The application remains the security boundary. The database is never exposed to the model.

## 1. Model and provider

Record these values in a versioned model manifest, never in a prompt:

- provider and endpoint
- model identifier and provider revision
- context-window limit confirmed from provider documentation
- input and output token limits
- routing policy (agent, task type, fallback)
- fallback model and the conditions that activate it
- timeout, retry and rate-limit policy

The current model is provider-hosted. Model weights, transformer internals and provider KV-cache behavior are provider-managed.

## 2. Transformer and inference architecture

Document the conceptual path as:

`tokens -> embeddings -> transformer attention/MLP blocks -> logits -> sampling/tool decision -> response`

Application-managed:

- prompt assembly
- message-history limits
- tool schemas
- tool execution
- permissions and campus filters
- output validation
- retries and audit records
- latency, token and failure metrics

Provider-managed:

- model weights
- tokenizer implementation
- GPU scheduling
- attention kernels
- KV-cache allocation and eviction
- hardware batching and throughput

Do not claim a specific KV-cache size or context window until it is verified for the exact provider model revision.

## 3. Prompt architecture

Every prompt should have a version and a stable structure:

1. system policy and role
2. current date and scoped user context
3. capabilities and tool-use policy
4. security and data-boundary rules
5. compact conversation history
6. current user request
7. tool schemas supplied separately by the SDK

Keep the stable system prefix unchanged between calls where possible. Do not put secrets, raw database dumps or hidden chain-of-thought instructions into prompts.

## 4. Sampling and generation

Keep generation settings in `ml/configs/model.yaml`, not scattered across routes.

Tune one variable at a time:

- temperature: low for tool selection and operational actions
- top-p: use only when needed; avoid tuning both temperature and top-p simultaneously
- max output tokens: separate limits for admin actions, educator answers and analytics
- stop sequences: only when validated against tool-call behavior
- tool choice: `auto` for normal agent turns; force a tool only when the route requires it
- deterministic versus creative mode: operational actions are deterministic; explanations may be more flexible

## 5. Reasoning and agent execution

The current agents use bounded tool-call loops. The loop must have:

- maximum steps
- per-call timeout
- retry-once policy for recoverable malformed tool calls
- tool-error feedback to the model
- final response fallback
- action audit trail

Do not expose or store hidden chain-of-thought. Return concise decision summaries such as which tool was used, what changed, and what remains. Security, authorization and database decisions must be deterministic application code.

## 6. Structured output

Use typed tool schemas and validate every boundary:

- tool name allowlist
- JSON argument parsing
- required argument validation
- enum validation
- database ownership checks
- typed tool result envelope
- final response schema where a caller needs machine-readable output

Invalid output should produce a safe retry or a clear user-facing failure, never an unchecked database mutation.

## 7. Context and KV-cache efficiency

- Keep system prompts stable and place changing data after the stable prefix.
- Send only the conversation window needed for the task.
- Summarize old history instead of replaying it forever.
- Keep tool results to fields needed for the next decision.
- Fetch live data through tools instead of placing entire tables in context.
- Truncate long notes, resource descriptions and lists.
- Record input/output token counts before optimizing.
- Treat provider KV-cache behavior as an optimization to measure, not an application guarantee.

## 8. Token cost and caching

Measure per request:

- input tokens
- output tokens
- tool-result tokens
- number of model turns
- number of tool calls
- total latency
- completed-task cost estimate
- retry/fallback count
- cache hit/miss when the provider exposes it

Never hardcode pricing in application logic without a dated price sheet. Keep pricing in a versioned config and label it as an estimate.

## 9. Hallucination and grounding

- Never guess live LMS numbers.
- Call the relevant tool for current tasks, tests, progress or recognition data.
- Apply role, user, campus and assignment filters before returning data.
- Say that the data is unavailable when a tool fails.
- Distinguish observed data from model interpretation.
- Preserve provenance in tool results where practical.
- Validate the final answer against the tool result and action log.
- Never let model text override application authorization.

## 10. Evaluation and reliability

The initial golden set should cover:

- tool selection
- correct arguments
- multi-step task completion
- refusal of unauthorized data
- campus scoping
- malformed tool-call recovery
- no-guess behavior for missing data
- destructive-action confirmation
- concise final responses

Track:

- tool-selection accuracy
- argument accuracy
- completed-task numerator/denominator
- hallucination rate
- unauthorized-data test pass rate
- latency p50 and p95
- retry and failure rate
- token and cost estimate
- fallback rate

The repository currently has application tests; this foundation adds a separate model-contract/evaluation layer. It is not a production success-rate claim.

## 11. Fine-tuning and QLoRA

Do not fine-tune first. First establish a reviewed dataset and baseline evaluation. If the baseline failure is caused by missing live data, wrong tool scope or poor prompt structure, fix those instead.

If QLoRA is later approved:

1. export approved, redacted examples
2. version the dataset
3. split train/validation/test without leakage
4. train adapter weights against a chosen open model
5. evaluate against the same golden set plus held-out cases
6. record base model, adapter, tokenizer and training config
7. publish only after human review

QLoRA does not modify the Groq-hosted model. It requires a separately hosted model and serving path.

## 12. Distillation

Use a stronger teacher only to create candidate examples. Filter, redact and human-review them. Compare the smaller student against the current Groq baseline for quality, cost, latency and safety. Keep authorization, database writes and security decisions outside the model.

## 13. Auto-agent learning

Production learning must be controlled:

`feedback -> reviewed example -> versioned dataset -> evaluation -> approved release`

Never allow an agent to silently rewrite its own prompt, tools, permissions or model in production. Store failures and feedback with privacy controls, then promote changes through CI and approval.

## Delivery stages

### Development

- edit prompts/tools/config in a branch
- run TypeScript tests and the local AI contract validator
- use synthetic or redacted data only
- do not call production mutations from evaluation

### Local Docker

- run the contract validator with Docker Compose
- optionally add a local Postgres fixture for integration tests
- use mock model responses for deterministic tests
- keep Groq integration tests opt-in and never require a key in CI

### CI

- validate YAML/JSON/config
- run golden contract tests
- run application lint, typecheck, unit/API/database tests
- build the application
- build the evaluation image
- run security/dependency scans
- fail on unauthorized-data regression

### Staging

- deploy the gateway/config to a separate environment
- run smoke tests with seeded non-production data
- measure latency, token usage, tool errors and model fallback
- require approval before promotion

### Production

- use versioned config and model manifest
- readiness checks must include configuration validation, not live mutation
- liveness checks must remain cheap
- canary only after staging passes
- record release ID, prompt version, tool version and model version
- rollback the whole AI release tuple, not only the model

### Kubernetes target

Kubernetes is relevant for a self-hosted gateway, evaluator, worker or model server. It is not required for the current direct Groq provider path. Any production Kubernetes deployment still needs a selected cluster, image registry, GPU/CPU target, ingress/load balancer and secret manager before manifests can be production-ready.
