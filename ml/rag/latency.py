"""Simple, repeatable p95 calculation for local retrieval measurements."""
from __future__ import annotations

import math


def percentile(samples_ms: list[float], percentile_value: float) -> float:
    if not samples_ms or not 0 <= percentile_value <= 100:
        raise ValueError("samples and percentile required")
    ordered = sorted(samples_ms)
    return ordered[max(0, math.ceil(percentile_value / 100 * len(ordered)) - 1)]


def summary(samples_ms: list[float]) -> dict[str, float | int]:
    return {"count": len(samples_ms), "p50_ms": percentile(samples_ms, 50), "p95_ms": percentile(samples_ms, 95)}
