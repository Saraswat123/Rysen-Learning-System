"""Regression checks for safe live-test diagnostics."""
from __future__ import annotations

import contextlib
import io
import unittest
import urllib.error

from groq_errors import SafeArgumentParser, http_error_summary


class GroqErrorTests(unittest.TestCase):
    def test_cli_rejects_secret_argument_without_echoing_it(self) -> None:
        parser = SafeArgumentParser()
        parser.add_argument("--prompt-key", action="store_true")
        output = io.StringIO()
        with contextlib.redirect_stderr(output), self.assertRaises(SystemExit):
            parser.parse_args(["gsk_dummy_secret_for_test"])
        self.assertNotIn("gsk_dummy_secret_for_test", output.getvalue())
        self.assertIn("hidden prompt", output.getvalue())

    def test_plain_text_error_redacts_the_key(self) -> None:
        key = "gsk_dummy_secret_for_test"
        error = urllib.error.HTTPError(
            "https://api.groq.com/openai/v1/models", 403, "Forbidden",
            {"Content-Type": "text/plain", "Server": "cloudflare"},
            io.BytesIO(f"Denied for {key}".encode()),
        )
        with error:
            summary = http_error_summary(error, key)
        self.assertIn("Groq HTTP 403", summary)
        self.assertIn("server=cloudflare", summary)
        self.assertNotIn(key, summary)

    def test_structured_permission_code_is_retained(self) -> None:
        error = urllib.error.HTTPError(
            "https://api.groq.com/openai/v1/models", 403, "Forbidden",
            {"Content-Type": "application/json"},
            io.BytesIO(b'{"error":{"code":"model_permission_blocked_project","type":"permissions_error"}}'),
        )
        with error:
            self.assertIn("code=model_permission_blocked_project", http_error_summary(error))


if __name__ == "__main__":
    unittest.main()
