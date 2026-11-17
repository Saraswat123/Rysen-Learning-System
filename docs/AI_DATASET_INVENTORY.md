# Rysen AI dataset inventory

| Source | Current use | Approval for model training |
| --- | --- | --- |
| `ml/evaluation/golden_tasks.json` | Five synthetic, redacted regression cases | Evaluation only |
| Live LMS database | Current facts through authenticated, role-scoped tools | Not approved as a training corpus |
| LMS attachments | Future retrieval sources after extraction, ACL mapping, and indexing | Not approved as a training corpus |
| Connected teacher training files | Candidate source documents requiring owner review and purpose check | Not established |

No approved instruction-tuning dataset or train/validation/test split is checked into this repository. Do not treat real student, educator, or campus records as training examples by default.

## Before post-training or fine-tuning

1. Name the task to improve and measure the current hosted-model baseline on held-out evaluations.
2. Record each candidate source's owner, purpose, permission, retention period, and allowed fields.
3. Remove direct identifiers, secrets, and free-text personal data; review a sample of the resulting examples.
4. Split examples by person, task, and time so related records do not cross train and validation sets.
5. Compare prompt, tool, and retrieval improvements against any fine-tuned or distilled model.
6. Version the approved dataset, model, prompt, tool schemas, and evaluation report before promotion.

Pre-training a base model and QLoRA fine-tuning are separate projects. Groq does not train LoRA adapters for customers; its [LoRA inference service](https://console.groq.com/docs/lora) currently requires enterprise access, externally trained adapters, and a specifically supported base model. The current `openai/gpt-oss-120b` is not listed as a supported LoRA base in that documentation. No production self-learning or automated weight updates are enabled.
