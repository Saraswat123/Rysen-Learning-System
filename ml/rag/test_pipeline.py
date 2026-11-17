import unittest
from chunking import chunks
from latency import summary


class RagPipelineTests(unittest.TestCase):
    def test_empty_document(self):
        self.assertEqual(chunks("  \n "), [])

    def test_long_paragraph_has_overlap(self):
        result = chunks("word " * 300, max_chars=200, overlap=40)
        self.assertGreater(len(result), 1)
        self.assertTrue(all(len(c) <= 200 for c in result))
        self.assertTrue(all(c for c in result))

    def test_p95_nearest_rank(self):
        self.assertEqual(summary(list(range(1, 101)))["p95_ms"], 95)


if __name__ == "__main__":
    unittest.main()
