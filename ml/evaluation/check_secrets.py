"""Fail CI when a tracked file contains a Groq API key; never print the key."""
from __future__ import annotations

import pathlib
import re
import subprocess
import sys

KEY_PATTERN = re.compile(rb"gsk_[A-Za-z0-9]{20,}")


def findings(root: pathlib.Path) -> list[str]:
    tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=root).split(b"\0")
    results: list[str] = []
    for raw_path in tracked:
        if not raw_path:
            continue
        path = root / raw_path.decode("utf-8", errors="surrogateescape")
        if not path.is_file():
            continue
        for line_number, line in enumerate(path.read_bytes().splitlines(), 1):
            if KEY_PATTERN.search(line):
                results.append(f"{path.relative_to(root)}:{line_number}")
    return results


if __name__ == "__main__":
    repository = pathlib.Path(__file__).resolve().parents[2]
    matches = findings(repository)
    if matches:
        print("Groq key pattern found in tracked files (values redacted):", *matches, sep="\n")
        sys.exit(1)
    print("No Groq key pattern in tracked files")
