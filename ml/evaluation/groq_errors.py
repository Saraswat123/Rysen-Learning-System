"""Show safe Groq error identifiers without printing response bodies or secrets."""
from __future__ import annotations

import argparse
import json
import re
import urllib.error


USER_AGENT = "RysenAI-Evaluation/0.1"


class SafeArgumentParser(argparse.ArgumentParser):
    """Avoid echoing a mistakenly supplied API key in CLI usage errors."""

    def error(self, message: str) -> None:
        self.exit(2, "Invalid arguments. Use --prompt-key and enter the key only at the hidden prompt.\n")


def http_error_summary(error: urllib.error.HTTPError, api_key: str = "") -> str:
    summary = f"Groq HTTP {error.code}"
    content_type = error.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() if error.headers else ""
    if re.fullmatch(r"[a-z0-9.+-]+/[a-z0-9.+-]+", content_type):
        summary += f" (content_type={content_type})"
    server = error.headers.get("Server", "").strip() if error.headers else ""
    if re.fullmatch(r"[A-Za-z0-9._/-]{1,80}", server):
        summary += f" (server={server})"
    body = error.read(4096)
    try:
        payload = json.loads(body)
    except (OSError, ValueError):
        if content_type == "text/plain":
            message = _safe_message(body.decode("utf-8", errors="replace"), api_key)
            if message:
                summary += f" (message={message})"
        return summary
    detail = payload.get("error") if isinstance(payload, dict) else None
    if not isinstance(detail, dict):
        return summary
    labels = []
    for name in ("code", "type"):
        value = detail.get(name)
        if isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9_.-]{1,80}", value):
            labels.append(f"{name}={value}")
    if not labels and isinstance(detail.get("message"), str):
        message = _safe_message(detail["message"], api_key)
        if message:
            labels.append(f"message={message}")
    return f"{summary} ({', '.join(labels)})" if labels else summary


def _safe_message(message: str, api_key: str) -> str:
    if api_key:
        message = message.replace(api_key, "[redacted]")
    message = re.sub(r"(?i)\b(?:gsk_|sk-)[A-Za-z0-9_-]+", "[redacted]", message)
    message = re.sub(r"(?i)\bBearer\s+\S+", "Bearer [redacted]", message)
    message = re.sub(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", "[email]", message)
    message = re.sub(r"[^\x20-\x7e]+", " ", message)
    return " ".join(message.split())[:240]
