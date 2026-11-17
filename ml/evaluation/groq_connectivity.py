"""Probe Groq's models endpoint without an API key or LMS data."""
from __future__ import annotations

import urllib.error
import urllib.request
import os
import socket
import subprocess

from groq_errors import USER_AGENT, http_error_summary


GROQ_URL = "https://api.groq.com/openai/v1/models"
CONTROL_URL = "https://api.github.com/"


def dns_probe(host: str) -> None:
    try:
        addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except socket.gaierror as error:
        print(f"DNS {host}: failed ({error.strerror or type(error).__name__})")
        return
    families = {address[0] for address in addresses}
    print(f"DNS {host}: IPv4={'yes' if socket.AF_INET in families else 'no'}, IPv6={'yes' if socket.AF_INET6 in families else 'no'}")


def curl_probe(label: str, url: str, ipv4: bool = False) -> bool:
    command = ["curl", "--silent", "--show-error", "--connect-timeout", "5", "--max-time", "10",
               "--output", os.devnull,
               "--write-out", "%{http_code}\t%{content_type}\t%{time_namelookup}\t%{time_connect}\t%{time_appconnect}"]
    if ipv4:
        command.append("--ipv4")
    command.append(url)
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=12, check=False)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        print(f"{label}: curl unavailable or timed out")
        return False
    values = result.stdout.strip().split("\t")
    if result.returncode != 0:
        reasons = {5: "proxy lookup failed", 6: "host lookup failed", 7: "connection refused/failed",
                   28: "connection timed out", 35: "TLS handshake failed", 60: "TLS certificate failed"}
        reason = reasons.get(result.returncode, "connection failed")
        timings = ", ".join(f"{name}={value}s" for name, value in zip(
            ("DNS", "TCP", "TLS"), values[2:5]))
        print(f"{label}: {reason} (curl exit={result.returncode}{', ' + timings if timings else ''})")
        return False
    status, content_type = (values + ["unknown"])[:2]
    print(f"{label}: HTTP {status} (content_type={content_type})")
    return True


def main() -> None:
    proxies = urllib.request.getproxies()
    print(f"HTTPS proxy configured: {'yes' if 'https' in proxies or 'all' in proxies else 'no'}")
    dns_probe("api.groq.com")
    dns_probe("api.github.com")
    request = urllib.request.Request(
        GROQ_URL,
        headers={"Accept": "application/json", "User-Agent": USER_AGENT},
    )
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            print(f"Unauthenticated Groq probe: HTTP {response.status}")
    except urllib.error.HTTPError as error:
        print(f"Unauthenticated Groq probe: {http_error_summary(error)}")
    except urllib.error.URLError as error:
        print(f"Unauthenticated Groq probe: connection error ({type(error.reason).__name__})")

    # No credentials or LMS data are sent. The control distinguishes a general
    # network problem from one affecting only the Groq host.
    curl_probe("curl control (GitHub)", CONTROL_URL)
    if not curl_probe("curl Groq", GROQ_URL):
        curl_probe("curl Groq IPv4", GROQ_URL, ipv4=True)


if __name__ == "__main__":
    main()
