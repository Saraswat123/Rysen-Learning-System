import unittest

from check_secrets import KEY_PATTERN


class SecretPatternTests(unittest.TestCase):
    def test_detects_groq_key_without_storing_one_in_test_source(self):
        synthetic = b"gsk_" + b"x" * 30
        self.assertIsNotNone(KEY_PATTERN.search(synthetic))
        self.assertIsNone(KEY_PATTERN.search(b"gsk_[A-Za-z0-9]{20,}"))


if __name__ == "__main__":
    unittest.main()
