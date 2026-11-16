# Rysen AI Kubernetes boundary

This directory is intentionally a deployment contract, not a claim of production deployment.

## Current path

The live Rysen AI path calls Groq from Next.js serverless routes. Kubernetes is not required for that provider-hosted inference path.

## Future self-hosted path

When a self-hosted model and GPU target are selected, add manifests for:

- namespace and service accounts
- model gateway deployment
- model server deployment
- internal service and ingress/load balancer
- readiness and liveness probes
- resource requests/limits
- HPA or KEDA policy
- network policy and secret references
- staging deployment
- canary rollout and rollback
- model/prompt/tool release labels

Recommended local validation target: kind or k3d. Local Kubernetes must use synthetic data and a mock or local model endpoint; it must not point at production Neon or production mutations.

## Promotion gates

1. Docker contract check passes.
2. Application lint, typecheck and tests pass.
3. Golden evaluation passes.
4. Container vulnerability scan passes.
5. Staging smoke test passes.
6. Canary metrics stay within the release policy.
7. Human approval promotes the release.

## Health endpoints

Keep health checks separate:

- liveness: process is running; no database or model call
- readiness: configuration and required dependencies are available
- model health: provider/model request probe, rate-limited and never used as a liveness probe

## Version labels

Every deployment should carry:

- application commit
- model/provider revision
- adapter revision, if any
- prompt version
- tool-schema version
- evaluation-set version
- config version
