# Rysen AI: first evaluation stage

The LMS currently runs Groq-hosted `openai/gpt-oss-120b` for insights, an admin agent, an educator agent, and task chat. `RYSEN_AI_MODEL` can select another model after it passes evaluation. The checked-in YAML records model limits and intended controls; it is not a runtime configuration loader.

## Local checks

```sh
python3 ml/evaluation/validate_contract.py
python3 -m unittest discover -s ml/evaluation -p 'test_*.py'
python3 -m unittest discover -s ml/rag -p 'test_*.py'
docker compose -f docker-compose.ai.yml run --rm ai-contract-check
```

The commands above do not need a Groq key or database connection. Docker Engine must be running for the Compose command.

## Live Groq check

```sh
python3 ml/evaluation/groq_connectivity.py
python3 ml/evaluation/groq_scenarios.py --prompt-key
```

The first command uses no key and compares Python and curl responses. The second asks for a fresh test key through a hidden prompt and sends four synthetic requests. Never place a key in a command argument, chat, committed file, or shell history. A live result is pending until the connection path and model access work.

`golden_tasks.json` is an evaluation seed, not a fine-tuning corpus. The RAG SQL and chunking code are design and test artifacts; no production document ingestion or retrieval path is enabled. See [dataset inventory](../docs/AI_DATASET_INVENTORY.md) and [production scenarios](../docs/AI_PRODUCTION_TEST_SCENARIOS.md) for the remaining gates.
