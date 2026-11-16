"""Deterministic document chunking used before embedding and indexing."""
from __future__ import annotations

import re


def chunks(text: str, *, max_chars: int = 1000, overlap: int = 150) -> list[str]:
    if max_chars < 100 or not 0 <= overlap < max_chars:
        raise ValueError("invalid chunk dimensions")
    clean = re.sub(r"[ \t]+", " ", text).strip()
    if not clean:
        return []
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", clean) if p.strip()]
    out: list[str] = []
    for paragraph in paragraphs:
        if len(paragraph) <= max_chars:
            if out and len(out[-1]) + len(paragraph) + 2 <= max_chars:
                out[-1] += "\n\n" + paragraph
            else:
                out.append(paragraph)
            continue
        start = 0
        while start < len(paragraph):
            end = min(start + max_chars, len(paragraph))
            if end < len(paragraph):
                boundary = paragraph.rfind(" ", start + max_chars // 2, end)
                if boundary > start:
                    end = boundary
            out.append(paragraph[start:end].strip())
            if end == len(paragraph):
                break
            start = max(start + 1, end - overlap)
    return out
