"""Validate the checked-in Rysen AI model/evaluation contracts.

This is intentionally dependency-free so Docker and GitHub Actions can run it
without a model API key, database, or network access.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "ml" / "configs" / "model.yaml"
GOLDEN = ROOT / "ml" / "evaluation" / "golden_tasks.json"


def main() -> None:
    config_text = CONFIG.read_text(encoding="utf-8")
    required_config_terms = [
        "schema_version:",
        "config_version:",
        "provider:",
        "model:",
        "context_window_tokens:",
        "max_output_tokens:",
        "tool_choice:",
        "prompt_version:",
        "tool_schema_version:",
        "approval_required:",
    ]
    missing = [term for term in required_config_terms if term not in config_text]
    if missing:
        raise SystemExit(f"model config missing required terms: {missing}")

    data = json.loads(GOLDEN.read_text(encoding="utf-8"))
    cases = data.get("cases", [])
    if not cases:
        raise SystemExit("golden dataset has no cases")

    ids = [case.get("id") for case in cases]
    if len(ids) != len(set(ids)):
        raise SystemExit("golden dataset contains duplicate case ids")

    for case in cases:
        for field in ("id", "agent", "input", "expected_tools", "must_not_access"):
            if field not in case:
                raise SystemExit(f"{case.get('id', '<unknown>')} missing {field}")
        if case.get("contains_production_data") is True:
            raise SystemExit("golden data must not declare production data")

    print(f"AI contracts valid: {len(cases)} redacted golden cases")


if __name__ == "__main__":
    main()
