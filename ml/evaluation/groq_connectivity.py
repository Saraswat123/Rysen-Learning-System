"""Probe Groq's models endpoint without an API key or LMS data."""
from __future__ import annotations

import urllib.error
import urllib.request
import os
import subprocess

from groq_errors import USER_AGENT, http_error_summary


def main() -> None:
    request = urllib.request.Request(
        "https://api.groq.com/openai/v1/models",
        headers={"Accept": "application/json", "User-Agent": USER_AGENT},
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            print(f"Unauthenticated Groq probe: HTTP {response.status}")
    except urllib.error.HTTPError as error:
        print(f"Unauthenticated Groq probe: {http_error_summary(error)}")
    except urllib.error.URLError as error:
        print(f"Unauthenticated Groq probe: connection error ({type(error.reason).__name__})")

    # curl uses a different HTTP/TLS client. Comparing unauthenticated results
    # helps distinguish an API permission response from a client/edge block.
    try:
        result = subprocess.run(
            ["curl", "--silent", "--show-error", "--max-time", "15", "--output", os.devnull,
             "--write-out", "%{http_code}\t%{content_type}", "https://api.groq.com/openai/v1/models"],
            capture_output=True, text=True, timeout=18, check=False,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        print("curl probe: unavailable")
        return
    if result.returncode != 0:
        print(f"curl probe: connection error (exit={result.returncode})")
        return
    status, _, content_type = result.stdout.partition("\t")
    print(f"curl probe: HTTP {status} (content_type={content_type or 'unknown'})")


if __name__ == "__main__":
    main()
