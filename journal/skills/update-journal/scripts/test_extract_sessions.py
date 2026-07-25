import json
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from extract_sessions import DigestEntry, extract_text_blocks, parse_since, parse_transcript_file


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


def _write_jsonl(path: Path, records: list[dict]) -> None:
    with path.open("w") as f:
        for record in records:
            f.write(json.dumps(record) + "\n")


class TestParseTranscriptFile(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmpdir.cleanup)
        self.project_dir = Path(self.tmpdir.name) / "-workspace"
        self.project_dir.mkdir()
        self.path = self.project_dir / "session-1.jsonl"

    def test_keeps_user_and_assistant_text_turns(self):
        _write_jsonl(
            self.path,
            [
                {
                    "type": "user",
                    "sessionId": "session-1",
                    "timestamp": "2026-07-20T10:00:00Z",
                    "message": {"role": "user", "content": "what's next on the todo list"},
                },
                {
                    "type": "assistant",
                    "sessionId": "session-1",
                    "timestamp": "2026-07-20T10:00:05Z",
                    "message": {
                        "role": "assistant",
                        "content": [{"type": "text", "text": "checking the list now"}],
                    },
                },
            ],
        )
        entries = parse_transcript_file(self.path, since=None)
        self.assertEqual(len(entries), 2)
        self.assertEqual(entries[0].project, "-workspace")
        self.assertEqual(entries[0].session_id, "session-1")
        self.assertEqual(entries[0].role, "user")
        self.assertEqual(entries[0].text, "what's next on the todo list")
        self.assertEqual(entries[1].text, "checking the list now")

    def test_skips_sidechain_entries(self):
        _write_jsonl(
            self.path,
            [
                {
                    "type": "user",
                    "isSidechain": True,
                    "sessionId": "session-1",
                    "timestamp": "2026-07-20T10:00:00Z",
                    "message": {"role": "user", "content": "subagent-internal instruction"},
                },
            ],
        )
        self.assertEqual(parse_transcript_file(self.path, since=None), [])

    def test_skips_non_user_assistant_record_types(self):
        _write_jsonl(
            self.path,
            [
                {"type": "file-history-snapshot", "messageId": "x"},
                {"type": "mode", "mode": "default"},
            ],
        )
        self.assertEqual(parse_transcript_file(self.path, since=None), [])

    def test_skips_malformed_lines_without_crashing(self):
        with self.path.open("w") as f:
            f.write("{not valid json\n")
            f.write(
                json.dumps(
                    {
                        "type": "user",
                        "sessionId": "session-1",
                        "timestamp": "2026-07-20T10:00:00Z",
                        "message": {"role": "user", "content": "still readable"},
                    }
                )
                + "\n"
            )
        entries = parse_transcript_file(self.path, since=None)
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0].text, "still readable")

    def test_filters_by_since_timestamp(self):
        _write_jsonl(
            self.path,
            [
                {
                    "type": "user",
                    "sessionId": "session-1",
                    "timestamp": "2026-07-01T00:00:00Z",
                    "message": {"role": "user", "content": "old message"},
                },
                {
                    "type": "user",
                    "sessionId": "session-1",
                    "timestamp": "2026-07-20T00:00:00Z",
                    "message": {"role": "user", "content": "new message"},
                },
            ],
        )
        since = parse_since("2026-07-10T00:00:00Z")
        entries = parse_transcript_file(self.path, since=since)
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0].text, "new message")


if __name__ == "__main__":
    unittest.main()
