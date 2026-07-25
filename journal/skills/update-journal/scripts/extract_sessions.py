#!/usr/bin/env python3
"""Condense Claude Code session transcripts into a chronological digest.

Scans every project's session transcripts under a projects directory
(default ~/.claude/projects), keeps only user/assistant text turns
(dropping tool_use/tool_result/thinking noise and subagent sidechains),
optionally filtered to entries after --since, and prints a chronological,
project-tagged digest to stdout.
"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


def parse_since(value: str | None) -> datetime | None:
    """Parse an ISO 8601 string into an aware UTC datetime, or None."""
    if value is None:
        return None
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def extract_text_blocks(content) -> list[str]:
    """Pull only text content out of a transcript message's `content` field.

    `content` is either a plain string (older/simple turns) or a list of
    typed blocks (text, tool_use, tool_result, thinking, ...) — only text
    blocks belong in a journal digest.
    """
    if isinstance(content, str):
        return [content] if content.strip() else []
    if isinstance(content, list):
        texts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                text = block.get("text", "")
                if text.strip():
                    texts.append(text)
        return texts
    return []


@dataclass
class DigestEntry:
    timestamp: datetime
    project: str
    session_id: str
    role: str
    text: str


def parse_transcript_file(path: Path, since: datetime | None) -> list[DigestEntry]:
    """Parse one session's JSONL transcript into digest entries.

    Skips malformed lines, non-user/assistant record types, subagent
    sidechain turns, and (if `since` is given) anything at or before it.
    """
    entries: list[DigestEntry] = []
    project = path.parent.name
    try:
        lines = path.read_text().splitlines()
    except OSError:
        return entries

    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            continue

        if record.get("type") not in ("user", "assistant"):
            continue
        if record.get("isSidechain"):
            continue

        timestamp_raw = record.get("timestamp")
        if not timestamp_raw:
            continue
        try:
            timestamp = datetime.fromisoformat(timestamp_raw.replace("Z", "+00:00"))
        except ValueError:
            continue
        if since is not None and timestamp <= since:
            continue

        message = record.get("message") or {}
        for text in extract_text_blocks(message.get("content")):
            entries.append(
                DigestEntry(
                    timestamp=timestamp,
                    project=project,
                    session_id=record.get("sessionId", "unknown"),
                    role=record["type"],
                    text=text,
                )
            )
    return entries
