# Rysen AI model training decision

Current state: **hosted inference only**. There is no approved training corpus, weight update, QLoRA adapter or student model. A live LMS answer should come from authorized tools/RAG, not memorized data.

| Stage | What changes | Evidence and data required | Current decision |
| --- | --- | --- | --- |
| Baseline | Prompt, tool schemas, retrieval and model routing; no weights change | Versioned synthetic/approved evals, latency/cost/security report | Do first |
| Base pre-training | Train a general foundation model from raw tokens | Large licensed corpus, compute, tokenizer/architecture plan, safety/privacy review and independent benchmarks | Out of scope until a separate business/compute case exists |
| Continued pre-training | Adapt a base model on a large domain corpus | Licensed, deduplicated corpus; leakage checks; held-out domain benchmarks | Consider only if terminology/knowledge gap survives RAG |
| Supervised post-training | Fine-tune on reviewed instructions, tool calls and desired answers | Consented/de-identified examples, train/validation/test split, robust tool/security evals | Candidate after baseline proves a stable gap |
| QLoRA/LoRA | Train a small adapter on an exact supported base model | External training environment, adapter/version registry, comparison with base | Candidate, not available automatically for current Groq model |
| Preference tuning | Optimize from ranked answers and policy labels | Human rankings, bias checks, security regression | Later, if supervised tuning is insufficient |
| Distillation | Train a smaller student from teacher-reviewed examples | Teacher provenance, filtering, human review, held-out cost/quality comparison | Later cost/latency experiment |

Groq currently provides [LoRA inference](https://console.groq.com/docs/lora) for enterprise customers using externally trained adapters on supported base models. Its documentation currently lists `llama-3.1-8b-instant`; the current `openai/gpt-oss-120b` is not listed. Recheck support and the organization's access before choosing a training base.

Training promotion is a separate decision from application deployment. Record dataset/model licenses, exact data version and split, training code/config, eval run, reviewer, rollback model and retention/deletion policy. Do not feed user feedback straight into weights, prompts or tools without review.
