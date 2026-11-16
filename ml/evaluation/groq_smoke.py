"""Opt-in Groq smoke test with synthetic context and latency reporting.

Run only after setting GROQ_API_KEY. This script never reads production data.
"""
from __future__ import annotations

import json
import os
import statistics
import time
import urllib.error
import urllib.request


def main() -> None:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise SystemExit("GROQ_API_KEY is required for the live smoke test")
    model = os.environ.get("RYSEN_AI_MODEL", "openai/gpt-oss-120b")
    count = int(os.environ.get("RYSEN_AI_SMOKE_SAMPLES", "3"))
    if not 1 <= count <= 100:
        raise SystemExit("RYSEN_AI_SMOKE_SAMPLES must be between 1 and 100")

    messages = [
        {"role": "system", "content": "Answer from the supplied synthetic document only. If absent, say unknown. Give one short sentence."},
        {"role": "user", "content": "Synthetic LMS document: Test A has 20 attempts and 15 passes. How many passes did Test A have?"},
    ]
    timings: list[float] = []
    input_tokens = output_tokens = 0
    for _ in range(count):
        body = json.dumps({"model": model, "messages": messages, "max_completion_tokens": 128}).encode()
        request = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=body,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            method="POST",
        )
        start = time.perf_counter()
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = json.load(response)
        except urllib.error.HTTPError as error:
            raise SystemExit(f"Groq HTTP {error.code}; inspect provider access and model ID") from None
        timings.append((time.perf_counter() - start) * 1000)
        answer = payload["choices"][0]["message"].get("content") or ""
        if "15" not in answer:
            raise SystemExit("Grounding smoke test failed: answer did not contain 15")
        usage = payload.get("usage", {})
        input_tokens += usage.get("prompt_tokens", 0)
        output_tokens += usage.get("completion_tokens", 0)

    from pathlib import Path
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "rag"))
    from latency import summary

    print(json.dumps({"model": model, "latency": summary(timings), "mean_ms": round(statistics.mean(timings), 1), "input_tokens": input_tokens, "output_tokens": output_tokens}))


if __name__ == "__main__":
    main()
