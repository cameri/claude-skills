import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from extract_sessions import extract_text_blocks, parse_since


class TestParseSince(unittest.TestCase):
    def test_none_input_returns_none(self):
        self.assertIsNone(parse_since(None))

    def test_naive_iso_string_gets_utc_attached(self):
        result = parse_since("2026-07-01T00:00:00")
        self.assertEqual(result, datetime(2026, 7, 1, tzinfo=timezone.utc))

    def test_aware_iso_string_is_preserved(self):
        result = parse_since("2026-07-01T00:00:00+05:00")
        self.assertEqual(result.utcoffset().total_seconds(), 5 * 3600)


class TestExtractTextBlocks(unittest.TestCase):
    def test_plain_string_content(self):
        self.assertEqual(extract_text_blocks("hello"), ["hello"])

    def test_blank_string_content_is_dropped(self):
        self.assertEqual(extract_text_blocks("   "), [])

    def test_block_list_keeps_only_text_blocks(self):
        content = [
            {"type": "text", "text": "wrote the plan"},
            {"type": "tool_use", "name": "Read", "input": {}},
            {"type": "tool_result", "content": "file contents..."},
            {"type": "text", "text": "then committed it"},
        ]
        self.assertEqual(
            extract_text_blocks(content), ["wrote the plan", "then committed it"]
        )

    def test_block_list_drops_blank_text_blocks(self):
        content = [{"type": "text", "text": "   "}]
        self.assertEqual(extract_text_blocks(content), [])

    def test_unrecognized_content_type_returns_empty(self):
        self.assertEqual(extract_text_blocks(42), [])


if __name__ == "__main__":
    unittest.main()
