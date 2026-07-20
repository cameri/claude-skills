#!/usr/bin/env python3
"""Simulate paperless-ngx's MATCH_ALL content-matching algorithm against a
real document's extracted text, without writing anything to the API.

Replicates documents/matching.py's matches() (MATCH_ALL branch) and
_split_match() from paperless-ngx: each word in the match text must appear
in the document content bounded by \\b...\\b (whole-word, case-insensitive
by default). This is the same check paperless-ngx runs when evaluating a
workflow trigger — running it locally first is what lets this skill apply
changes without a human confirmation step.
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request


def split_match(match_text: str) -> list[str]:
    findterms = re.compile(r'"([^"]+)"|(\S+)').findall
    normspace = re.compile(r"\s+").sub
    return [
        re.escape(normspace(" ", (t[0] or t[1]).strip())).replace(r"\ ", r"\s+")
        for t in findterms(match_text)
    ]


def simulate_match_all(
    match_text: str,
    content: str,
    is_insensitive: bool = True,
) -> tuple[bool, str | None]:
    flags = re.IGNORECASE if is_insensitive else 0
    for word in split_match(match_text):
        if not re.search(rf"\b{word}\b", content, flags=flags):
            return False, word
    return True, None


def get_token(url: str, username: str, password: str) -> str:
    req = urllib.request.Request(
        f"{url}/api/token/",
        data=json.dumps({"username": username, "password": password}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    return json.load(urllib.request.urlopen(req))["token"]


def get_document_content(url: str, token: str, document_id: int) -> str:
    req = urllib.request.Request(
        f"{url}/api/documents/{document_id}/",
        headers={"Authorization": f"Token {token}"},
    )
    return json.load(urllib.request.urlopen(req)).get("content") or ""


def _get_env(name: str) -> str:
    try:
        return os.environ[name]
    except KeyError:
        raise EnvironmentError(name) from None


def main() -> int:
    args = sys.argv[1:]
    case_sensitive = "--case-sensitive" in args
    positional = [a for a in args if a != "--case-sensitive"]

    if len(positional) != 2:
        print(
            "usage: simulate_match.py <match_text> <document_id> [--case-sensitive]",
            file=sys.stderr,
        )
        return 2

    match_text, document_id_arg = positional

    try:
        document_id = int(document_id_arg)
    except ValueError:
        print(f"ERROR: document_id must be an integer, got {document_id_arg!r}", file=sys.stderr)
        return 2

    try:
        url = _get_env("PAPERLESS_URL").rstrip("/")
        username = _get_env("PAPERLESS_USERNAME")
        password = _get_env("PAPERLESS_PASSWORD")
    except EnvironmentError as exc:
        print(f"ERROR: missing required environment variable {exc}", file=sys.stderr)
        return 2

    try:
        token = get_token(url, username, password)
        content = get_document_content(url, token, document_id)
    except (urllib.error.URLError, urllib.error.HTTPError) as exc:
        print(f"ERROR: request to paperless-ngx failed: {exc}", file=sys.stderr)
        return 2
    except (OSError, ValueError, KeyError) as exc:
        print(f"ERROR: unexpected failure communicating with paperless-ngx: {exc}", file=sys.stderr)
        return 2

    is_insensitive = not case_sensitive
    matched, failed_word = simulate_match_all(match_text, content, is_insensitive=is_insensitive)
    if matched:
        print(f"MATCH: all words in {match_text!r} found in document {document_id}")
        return 0
    print(
        f"NO MATCH: word {failed_word!r} (from {match_text!r}) "
        f"not found as a whole word in document {document_id}",
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
